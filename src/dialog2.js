#!/usr/bin/env node --no-deprecation
import punycode from 'punycode/punycode.js';
import EventEmitter from 'events';
import speak from './speaker.js';
import OpenAI from 'openai';
import fs, { readFileSync } from 'fs';

import { Marked, marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import storage from 'node-persist';
import { loadJson, saveJson } from './fileUtils.js';
import importAllTools, { execShell } from './tools/index.js';

const markedHtml = new Marked();
const markedTerm = new Marked(markedTerminal({
    width: process.stdout.columns - 1,
    reflowText: true,
    tab: 2,
}));

class Dialog2 extends EventEmitter {

    constructor(openAIConfig) {
        super();
        this.openai = new OpenAI(openAIConfig);
        this.model = 'gpt-4-0125-preview'
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
                { role: "system", content: fs.readFileSync(instructionsFile, 'utf8') }
            ]
        }

        const { success, stdout } = await execShell({command: 'git config --get user.name'})
        this.userName = success && stdout ? stdout.trim() : process.env.USER;
        this.assistant = {name: "UC"};

        this.toolsByName = await importAllTools();
        this.tools = Object.values(this.toolsByName).map((t) => ({
            type: 'function',
            function: t.spec,
        }));


        // replay history
        for (let m of this.messages) {
            if (m.role !== 'system') {
                this.emit('message', {historic: true, ...m});
            }
        }
    }


    async addMessage(text, typeTag) {
        if (!text || text.trim() === '') {
            throw "Can't send an empty message";
        }

        let content = text;
        if (typeTag) {
            content = `<${typeTag}>\n${text}\n</${typeTag}>`
        }
        this.messages.push({ role: "user", content });
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
            role: "assistant", content: ''
        }
        let messagesCopy = JSON.parse(JSON.stringify(this.messages));
        this.messages.push(m);
        let first = true;
        let toolCallsByIndex = {};
        for await (let {content, tool_calls} of this.streamCompletion(messagesCopy)) {
            if (content) {
                m.content += content;
                this.emit('thinking', {
                    message: m,
                    chunk: content,
                    first
                });
                first = false;
            }
            else if (tool_calls) {
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
        for (const index in toolCallsByIndex) {
            console.log("CBTEST FULL TOOL CALL", index);
            console.log(toolCallsByIndex[index]);



        }
        let tool_calls = Object.values(toolCallsByIndex);
        if (tool_calls.length) {

            this.messages.push({
                role: "assistant",
                tool_calls
            })

            let tool_outputs = await this.#runToolCalls(tool_calls);

            for (let output of tool_outputs) {
                let m = {
                    role: 'tool',
                    content: output.output,
                    tool_call_id: output.tool_call_id
                }
                this.messages.push(m);
            }
            // recurse! (is this a good idea?)
            return await this.processRun();
        }

        await this.save();
        this.thinking = false;
        this.emit("done_thinking");
        this.emit("message", {streamed: true, ...m});
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
                });
                continue;
            }
            let f = this.toolsByName[call.function.name];
            try {
                let arg = this._parseToolArguments(call.function.arguments);
                console.log('CBTEST RUNNING TOOL', call.function.name, arg);
                const result = await f(arg);
                tool_outputs.push({
                    tool_call_id: call.id,
                    output: JSON.stringify(result),
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
                });
            }
        }
        return tool_outputs;
    }

    _parseToolArguments(argumentsStr) {

        if (!argumentsStr.trim().startsWith('{')) {
            throw new Error(`Expecting arguments formatted as JSON, but got "${argumentsStr}"`)
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
                let trimmedArguments = argumentsStr.replace(/\}\s*$/, '');
                return JSON.parse(trimmedArguments);
            } else {
                throw parseError; // Re-throw exception if it's not the specific case we're catching.
            }
        }
    }

    async * streamCompletion(messages) {
        // if another one is going, cancel that.
        this.cancelStream && this.cancelStream();
        let shouldCancel = false;
        let completion;
        this.cancelStream = () => {
            shouldCancel = true;
            this.cancelStream = null;
        }

        completion = await this.openai.chat.completions.create({
            messages,
            model: this.model,
            stream: true,
            tools: this.tools,
            tool_choice: 'auto'
        })
        for await (const chunk of completion) {
            if (shouldCancel) {
                yield '\n';
                break;
            }
            if (chunk.choices[0].finish_reason) {
                if (chunk.choices[0].finish_reason != "stop") {
                    console.error("\nFinish reason: " + chunk.choices[0].finish_reason);
                } else {
                    yield '\n'
                }
                break;
            } else {
                yield chunk.choices[0].delta
            }
        }
    }

    async cancelOutstanding() {
        this.cancelStream && this.cancelStream();
    }
}




if (process.argv[1].endsWith("/uc") || process.argv[1] === new URL(import.meta.url).pathname) {
    //console.log(`File run directly, lets test it`);

    const instructions = readFileSync('instructions.md', 'utf8');
    let msg = process.argv.slice(2).join(' ');
    //console.log(msg);

    const d = new Dialog2();

    let messages = [
        { role: "system", content: instructions },
        { role: "system", content: `the current directory is ${process.env.cwd}` },
        { role: "user", content: msg || "can you demo some markdown" }
    ]

    for await (let x of d.streamCompletion(messages)) {
        process.stdout.write(x);
    }
}

export default Dialog2;
