import EventEmitter from 'events';
import fs from 'fs';
import { loadJson, saveJson } from './fileUtils.js';
import importAllTools, { execShell } from './tools/index.js';

class DialogBase extends EventEmitter {
  constructor() {
    super();
    this.messages = null;
    this.threadFile = null;
    this.userName = null;
    this.assistant = { name: 'UC' };
    this.toolsByName = null;
    this.tools = null;
    this.stream = null;
    this.model = null;
    this.summarizationThreshold = 20; // Number of messages before summarization
    this.summarizationChunkSize = 12; // Number of messages to summarize at once
  }

  async summarizeMessages(startIndex, endIndex) {
    console.log('Summarizing...');

    const messagesToSummarize = this.messages.slice(startIndex, endIndex);
    const context = this.messages.slice(0, startIndex).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const summarizationPrompt = `
      Summarize the following conversation in a concise manner, capturing key points and decisions:
      
      Context:
      ${context}
      
      Conversation to summarize:
      ${messagesToSummarize.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Summary:
    `;

    // Use the existing model to generate the summary
    const { message } = await this.getCompletion([{ role: 'user', content: summarizationPrompt }]);

    console.log('Summarization result:', message.content);

    return {
      role: 'system',
      content: message.content,
      summary: `[Summary of messages ${startIndex} to ${endIndex - 1}]`
    };
  }

  async checkAndSummarize() {
    if (this.messages.length >= this.summarizationThreshold) {
      const summarizationIndex = this.messages.length - this.summarizationChunkSize;
      const summary = await this.summarizeMessages(1, summarizationIndex);
      this.messages = [this.messages[0], summary, ...this.messages.slice(summarizationIndex)];
      await this.save();
    }
  }

  async setup({
    threadFile = '.thread',
    instructionsFile = 'instructions.md'
  } = {}) {
    this.threadFile = threadFile;
    this.instructionsFile = instructionsFile;

    this.messages = await loadJson(threadFile);
    if (!this.messages) {
      this.messages = [
        {
          role: 'system',
          content: fs.readFileSync(instructionsFile, 'utf8'),
          summary: `[Initial instructions from ${instructionsFile}]`,
        },
      ];
    }

    const { success, stdout } = await execShell({ command: 'git config --get user.name' });
    this.userName = success && stdout ? stdout.trim() : process.env.USER;

    this.toolsByName = await importAllTools();
    this.tools = Object.values(this.toolsByName).map((t) => ({
      type: 'function',
      function: t.spec,
    }));

    // Replay history
    for (let m of this.messages) {
      this.emit('message', { historic: true, ...m });
    }
  }

  async addMessage(msg, { tag, fire = true, allowCombining = false } = {}) {
    let m;
    if (typeof msg === 'string') {
      if (!msg || msg.trim() === '') {
        throw new Error('Can\'t send an empty message');
      }
      let content = msg;
      if (tag) {
        content = `<${tag}>\n${msg}\n</${tag}>`;
      }
      m = { role: 'user', content, ts: +new Date() };
    } else if (typeof msg === 'object') {
      m = msg;
    } else {
      console.error('Invalid message');
      throw new Error('Invalid message');
    }

    let lastMessage = this.messages[this.messages.length - 1];
    if (allowCombining && lastMessage?.role === m.role && m.ts - lastMessage.ts < 1000 * 60) {
      this.messages[this.messages.length - 1].content += '\n' + m.content;
    } else {
      this.messages.push(m);
    }

    if (fire) {
      this.emit('message', m);
    }
    await this.save();
    
    // Check and summarize after adding a new message
    await this.checkAndSummarize();
  }

  async save() {
    await saveJson(this.threadFile, this.messages);
  }

  async processRun() {
    this.emit('start_thinking');
    let m;

    let toolCallsByIndex = {};
    if (this.stream) {
      m = { role: 'assistant', content: '' };
      let messagesCopy = this.stripDialog(this.messages);
      this.messages.push(m);
      let first = true;
      for await (let { content, tool_calls } of this.streamCompletion(messagesCopy)) {
        if (content) {
          m.content += content;
          this.emit('chunk', {
            message: m,
            chunk: content,
            first,
          });
          first = false;
        } else if (tool_calls) {
          for (let c of tool_calls) {
            if (!toolCallsByIndex[c.index]) {
              toolCallsByIndex[c.index] = c;
              this.emit('start_thinking', { tool: true });
            } else {
              toolCallsByIndex[c.index].function.arguments += c.function.arguments;
            }
          }
        }
      }
    } else {
      let messagesCopy = this.stripDialog(this.messages);
      let { finish_reason, message } = await this.getCompletion(messagesCopy);
      m = message;
      if (finish_reason === 'stop') {
        this.messages.push(message);
      } else if (finish_reason === 'tool_calls') {
        for (let c of message.tool_calls) {
          toolCallsByIndex[c.id] = c;
        }
      } else {
        console.log('CBTEST unexpected finish reason', finish_reason, message);
        throw new Error('Unexpected finish reason: ' + finish_reason);
      }
    }

    let tool_calls = Object.values(toolCallsByIndex);
    if (tool_calls.length) {
      this.emit('start_thinking', { tool: true });
      let callMessage = {
        role: 'assistant',
        content: m.content,
        tool_calls,
        summary: 'Using tool ' + tool_calls.map((c) => c.function.name).join(', '),
      };
      this.messages.push(callMessage);
      this.emit('message', callMessage);

      let tool_outputs = await this.runToolCalls(tool_calls);

      for (let output of tool_outputs) {
        let m = {
          role: 'tool',
          content: output.output,
          tool_call_id: output.tool_call_id,
          summary: output.summary,
        };
        this.messages.push(m);
        this.emit('message', m);
        if (output.output._userContent) {
          this.messages.push({
            role: 'user',
            content: output.output._userContent,
          });
        }
      }
      return await this.processRun();
    }

    await this.save();
    this.thinking = false;
    this.emit('done_thinking');
    this.emit('message', { streamed: this.stream, ...m });
    return m;
  }

  async runToolCalls(toolCalls) {
    let tool_outputs = [];
    for (let call of toolCalls) {
      if (call.type !== 'function' || !this.toolsByName[call.function.name]) {
        console.error('unknown tool call', call);
        tool_outputs.push({
          tool_call_id: call.id,
          output: JSON.stringify({
            success: false,
            error: `FAILED! No such ${call.type} as ${call.function.name}`,
          }),
          summary: `FAILED! No such ${call.type} as ${call.function.name}`,
        });
        continue;
      }
      let f = this.toolsByName[call.function.name];
      try {
        let arg = this.parseToolArguments(call.function.arguments);
        const result = await f(arg);
        let output;
        if (Array.isArray(result) && result[0] && result[0].type) {
          output = result;
        } else {
          output = JSON.stringify(result);
        }
        tool_outputs.push({
          tool_call_id: call.id,
          output,
          summary: `Ran ${call.function.name} with args ${call.function.arguments} returned ${JSON.stringify(result).slice(0, 400)}`,
        });
      } catch (ex) {
        console.error(`Error running command ${call.function.name} with args ${call.function.arguments}`);
        console.error(ex);
        tool_outputs.push({
          tool_call_id: call.id,
          output: JSON.stringify({
            success: false,
            error_message: `Running this tool failed. ${ex.toString()}`,
          }),
          summary: `Running ${call.function.name} failed. ${ex.toString()}`,
        });
      }
    }
    return tool_outputs;
  }

  parseToolArguments(argumentsStr) {
    if (!argumentsStr.trim().startsWith('{')) {
      throw new Error(`Expecting arguments formatted as JSON, but got \"${argumentsStr}\"`);
    }

    try {
      return JSON.parse(argumentsStr);
    } catch (parseError) {
      if (
        parseError instanceof SyntaxError &&
        parseError.message.includes('Unexpected non-whitespace character after JSON')
      ) {
        let trimmedArguments = argumentsStr.replace(/}\s*$/, '');
        return JSON.parse(trimmedArguments);
      } else {
        throw parseError;
      }
    }
  }

  async* streamCompletion(messages) {
    throw new Error('streamCompletion method not implemented');
  }

  async getCompletion(messages) {
    throw new Error('getCompletion method not implemented');
  }

  async cancelOutstanding() {
    throw new Error('cancelOutstanding method not implemented');
  }

  stripDialog(messages) {
    return messages.map(({ role, content, name, tool_calls, tool_call_id }) => ({
      role,
      content,
      name,
      tool_calls,
      tool_call_id,
    }));
  }
}


export default DialogBase;
