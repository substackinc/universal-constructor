#!/usr/bin/env node --no-deprecation
import EventEmitter from 'events';
import OpenAI from 'openai';
import fs, { readFileSync } from 'fs';

import { loadJson, saveJson } from './fileUtils.js';
import importAllTools, { execShell } from './tools/index.js';

class Dialog2 extends EventEmitter {

    constructor(openAIConfig) {
        super();
        this.openai = new OpenAI(openAIConfig);
        this.model = 'gpt-4-0125-preview';
        this.messages = null;

    }

    async setup({
                    threadFile = '.thread',
                    instructionsFile = 'instructions.md',
                } = {}) {
        this.threadFile = threadFile;
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
        this.assistant = { name: 'UC' };

        this.toolsByName = await importAllTools();
        this.tools = Object.values(this.toolsByName).map((t) => ({
            type: 'function',
            function: t.spec,
        }));


        // replay history
        for (let m of this.messages) {
            this.emit('message', { historic: true, ...m });
        }
    }


    async addMessage(msg, { tag, fire = true} = {}) {
        let m;
        if (typeof msg === 'string') {
            if (!msg || msg.trim() === '') {
                throw new Error('Can\'t send an empty message');
            }
            let content = msg;
            if (tag) {
                content = `<${tag}>\n${msg}\n</${tag}>`;
            }
            m = { role: 'user', content };
        } else if (typeof msg === 'object') {
            m = msg;
        } else {
            console.error('Invalid message');
            throw new Error('Invalid message');
        }

        this.messages.push(m);
        if (fire) {
            this.emit('message', m);
        }
        await this.save();
    }

    async save() {
        await saveJson(this.threadFile, this.messages);
    }

    async processRun() {
        if (!this.thinking) {
            this.thinking = true;
            this.emit('start_thinking');
        }

        const m = {
            role: 'assistant', content: '',
        };
        let messagesCopy = stripDialog(this.messages);
        this.messages.push(m);
        let first = true;
        let toolCallsByIndex = {};
        for await (let { content, tool_calls } of this.streamCompletion(messagesCopy)) {
            if (content) {
                m.content += content;
                this.emit('thinking', {
                    message: m,
                    chunk: content,
                    first,
                });
                first = false;
            } else if (tool_calls) {
                for (let c of tool_calls) {
                    // console.log("CBTEST C");
                    // console.log(c);
                    if (!toolCallsByIndex[c.index]) {
                        toolCallsByIndex[c.index] = c;
                    } else {
                        toolCallsByIndex[c.index].function.arguments += c.function.arguments;
                    }
                }
            }
        }
        let tool_calls = Object.values(toolCallsByIndex);
        if (tool_calls.length) {

            let callMessage = {
                role: 'assistant',
                tool_calls,
                summary: 'Using tool ' + tool_calls.map((c) => c.function.name).join(', '),
            };
            this.messages.push(callMessage);
            this.emit('message', callMessage);

            let tool_outputs = await this.#runToolCalls(tool_calls);

            for (let output of tool_outputs) {
                let m = {
                    role: 'tool',
                    content: output.output,
                    tool_call_id: output.tool_call_id,
                    summary: output.summary,
                };
                this.messages.push(m);
                this.emit('message', m);
            }
            // recurse! (is this a good idea?)
            return await this.processRun();
        }

        await this.save();
        this.thinking = false;
        this.emit('done_thinking');
        this.emit('message', { streamed: true, ...m });
        return m;
    }

    async #runToolCalls(toolCalls) {
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
                let arg = this._parseToolArguments(call.function.arguments);
                //console.log('CBTEST RUNNING TOOL', call.function.name, arg);
                const result = await f(arg);
                tool_outputs.push({
                    tool_call_id: call.id,
                    output: JSON.stringify(result),
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

    _parseToolArguments(argumentsStr) {

        if (!argumentsStr.trim().startsWith('{')) {
            throw new Error(`Expecting arguments formatted as JSON, but got "${argumentsStr}"`);
        }

        // This function attempts to parse a JSON string, correcting for a common error pattern:
        // an extra closing curly brace at the very end of the string.
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
                throw parseError; // Re-throw exception if it's not the specific case we're catching.
            }
        }
    }

    async* streamCompletion(messages) {
        // if another one is going, cancel that.
        this.cancelStream && this.cancelStream();
        let shouldCancel = false;
        let completion;
        this.cancelStream = () => {
            shouldCancel = true;
            this.cancelStream = null;
        };

        completion = await this.openai.chat.completions.create({
            messages,
            model: this.model,
            stream: true,
            tools: this.tools,
            tool_choice: 'auto',
        });
        for await (const chunk of completion) {
            if (shouldCancel) {
                yield { content: '... [cancelled]\n' };
                break;
            }
            if (chunk.choices[0].finish_reason) {
                if (chunk.choices[0].finish_reason !== 'stop' && chunk.choices[0].finish_reason !== 'tool_calls') {
                    console.error('\nFinish reason: ' + chunk.choices[0].finish_reason);
                } else {
                    yield { content: '\n' };
                }
                break;
            } else {
                yield chunk.choices[0].delta;
            }
        }
    }

    async cancelOutstanding() {
        this.cancelStream && this.cancelStream();
    }
}

function stripDialog(messages) {
    return messages.map(({ role, content, name, tool_calls, tool_call_id }) => ({
        role,
        content,
        name,
        tool_calls,
        tool_call_id,
    }));
}


if (process.argv[1].endsWith('/uc') || process.argv[1] === new URL(import.meta.url).pathname) {
    //console.log(`File run directly, lets test it`);

    const instructions = readFileSync('instructions.md', 'utf8');
    let msg = process.argv.slice(2).join(' ');
    //console.log(msg);

    const d = new Dialog2();

    let messages = [
        { role: 'system', content: instructions },
        { role: 'system', content: `the current directory is ${process.env.cwd}` },
        { role: 'user', content: msg || 'can you demo some markdown' },
    ];

    for await (let x of d.streamCompletion(messages)) {
        process.stdout.write(x);
    }
}

export default Dialog2;
