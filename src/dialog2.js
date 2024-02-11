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
import { execShell } from './tools/index.js';

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
        this.thinking = true;
        this.emit('start_thinking');

        const m = {
            role: "assistant", content: ''
        }
        let messagesCopy = JSON.parse(JSON.stringify(this.messages));
        this.messages.push(m);
        let first = true;
        for await (let x of this.streamCompletion(messagesCopy)) {
            m.content += x;
            this.emit('thinking', {
                message: m,
                chunk: x,
                first
            });
            first = false;
        }
        //TODO: handle tool calls

        await this.save();
        this.emit("done_thinking");
        this.emit("message", {streamed: true, ...m});
        return m;
    }

    async * streamCompletion(messages) {
        // if another one is going, cancel that.
        this.cancelStream && this.cancelStream();
        let shouldCancel = false;
        this.cancelStream = () => {
            shouldCancel = true;
            this.cancelStream = null;
        }

        const completion = await this.openai.chat.completions.create({
            messages,
            model: this.model,
            stream: true
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
                yield chunk.choices[0].delta.content
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
