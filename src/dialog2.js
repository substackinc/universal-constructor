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
        let mcopy = JSON.parse(JSON.stringify(this.messages));
        this.messages.push(m);
        for await (let x of this.streamCompletion(mcopy)) {
            m.content += x;
            this.emit('stream', x)
        }
        //TODO: handle tool calls

        await this.save();
        this.emit("done_thinking");
        this.emit("message", m)
        return m;
    }

    async * streamCompletion(messages) {
        const completion = await this.openai.chat.completions.create({
            messages,
            model: this.model,
            stream: true
        })
        for await (const chunk of completion) {
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
}

async function * chunkMarkdown(textStream) {

}

async function * streamMarkdown2(textStream) {

    const chunk = '';
    while(true) {
        const { value, done } = await textStream.next();



    }
}

function checkForUnclosedMarkdown(inlineText) {

    //unclosed * or **
    if ([...inlineText.matchAll(/\*\*?/g)].length % 2 != 0) {
        return true;
    }
    if ([...inlineText.matchAll(/`/g)].length % 2 != 0) {
        return true;
    }

}

async function * streamMarkdownChunks(textStream) {

    let chunk = '';
    let inlineMode = false;

    while(true) {
        let {value, done} = await textStream.next();


        if (inlineMode) {
            if (value.indexOf('\n') != -1) {
                chunk += value;
                yield chunk;
                inlineMode = false;
                chunk = '';
            }
        } else if (chunk === '') {
            if (value.match(/^\n+$/m)) {
                // only newlines between blocks, ignore.
            } else if ([' ', '#', '`', '-', '|'].includes(value[0])) {
                // block mode
                chunk += value;
                inlineMode = false;
            } else {
                chunk += value;
                inlineMode = true;
            }

        }

        if (done) {
            break;
        }
    }

}

async function * streamMarkdown(textStream) {

    let chunk = '';
    let inlineMode = false;

    for await (const t of textStream) {

        if (inlineMode) {

        }

        if (chunk.length < 4) {
            chunk += t;
        } else {
            let prevTokens = marked.lexer(chunk);
            let newTokens = marked.lexer(chunk + t);

            if (newTokens.length > prevTokens.length) {
                //yield markedTerm.parseInline(chunk);
                // for (let foo of prevTokens) {
                //     console.log(foo);
                // }
                // yield ''
                yield chunk + "$";
                chunk = t;
            } else {
                chunk += t;
            }
        }
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

    /*
   const completion = await openai.chat.completions.create({
       messages: [
           { role: "system", content: instructions },
           { role: "system", content: `the current directory is ${process.env.cwd}` },
           {role: "user", content: msg}
       ],
       model: "gpt-4-0125-preview",
       stream: true
   });


   let line = '';
   for await (const chunk of completion) {

       if (chunk.choices[0].finish_reason) {
           if (chunk.choices[0].finish_reason != "stop") {
               console.error("\nFinish reason: " + chunk.choices[0].finish_reason);
           } else {
               process.stdout.write('\n');
           }
           break;
           //console.log('\n', chunk.choices[0].finish_reason)
       } else {
           let c = chunk.choices[0].delta.content;

           line+= c;
           if (c.endsWith('\n')) {
               process.stdout.write(line);
               line = '';
           }
           //process.stdout.write(chunk.choices[0].delta.content);
          // wholeContent += chunk.choices[0].delta.content;
           // process.stdout.write(`\n################\n`)
           // process.stdout.write(wholeContent)
           // process.stdout.write(`\n-----\n`)
           // process.stdout.write(marked.parse(wholeContent));

           // process.stdout.write(markedHtml.parse(wholeContent));
       }

   } */
}

async function* streamCompletion(messages) {

}

export default Dialog2;
