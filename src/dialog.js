import EventEmitter from 'events';
import { readFileSync, writeFileSync } from 'fs';
import OpenAI from 'openai';
import importAllTools from './tools/index.js';

function readFile(file) {
    try {
        return readFileSync(file, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

function writeFile(file, content) {
    return writeFileSync(file, content);
}

class Dialog extends EventEmitter {
    constructor(openAIConfig) {
        super();
        this.openai = new OpenAI(openAIConfig);
        this.beta = this.openai.beta;
        this.assistant = null;
        this.thread = null;
        this.lastMessageId = null;
        this.toolsByName = null;
    }

    async setup({
                    pastMessagesToRetrieve = 2,
                    threadFile = '.thread',
                    assistantFile = '.assistant',
                    instructionsFile = 'instructions.md',
                } = {}) {
        // setup assistant
        let assistantId = readFile(assistantFile);
        this.toolsByName = await importAllTools();
        const tools = Object.values(this.toolsByName).map((t) => ({
            type: 'function',
            function: t.spec,
        }));
        tools.push(
            { type: 'retrieval' },
            { type: 'code_interpreter' },
        );

        const assistantConfig = {
            name: 'UC',
            description: `${process.env.user}'s Universal Constructor coding companion.`,
            instructions: readFile(instructionsFile).replaceAll(':user', process.env.USER),
            tools,
            model: 'gpt-4-1106-preview',
        };
        if (!assistantId) {
            console.log(`Creating a new assistant: ${assistantConfig.name}, ${assistantConfig.description}`);
            this.assistant = await this.beta.assistants.create(assistantConfig);
            writeFile(assistantFile, this.assistant.id);
            console.log(`Assistant saved to ${assistantFile} file for next time.`);
        } else {
            console.log(`Updating assistant...`);
            this.assistant = await this.beta.assistants.update(assistantId, assistantConfig);
        }

        // setup thread
        let threadId = readFile(threadFile);
        if (!threadId) {
            this.thread = await this.beta.threads.create();
            writeFile(threadFile, this.thread.id);
            console.log('\nThis is the start of a brand new thread!');
        } else {
            this.thread = await this.beta.threads.retrieve(threadId);
            console.log('\n...continuing from previous thread');
        }

        // cancel any outstanding runs
        await this.cancelOutstanding();

        // fetch recent messages and fire events for them
        if (pastMessagesToRetrieve > 0) {
            await this._fetchMessages(pastMessagesToRetrieve);
        }
    }

    async _fetchMessages(limit = 20) {
        const { data } = await this.beta.threads.messages.list(this.thread.id, {
            order: 'desc',
            before: this.lastMessageId,
            limit,
        });
        if (data.length > 0) {
            this.lastMessageId = data[0].id;
            for (let message of data.reverse()) {
                let content = message.content.map((c) => c.text.value).join('\n');
                if (!content) {
                    console.error('missing content for message', message);
                    console.error(message.content);
                    content = '<missing>';
                }
                this.emit('message', {
                    role: message.role,
                    content,
                    message,
                });
            }
        }
    }

    async processMessage(messageContent) {
        // fetch and fire any messages so we don't miss any before this new one we create
        await this._fetchMessages();

        let message = await this.beta.threads.messages.create(this.thread.id, {
            role: 'user',
            content: messageContent,
        });
        this.lastMessageId = message.id;

        this.emit('start_thinking');
        let run = await this.beta.threads.runs.create(this.thread.id, {
            assistant_id: this.assistant.id,
        });

        while (true) {
            run = await this.beta.threads.runs.retrieve(this.thread.id, run.id);

            if (['in_progress', 'queued', 'cancelling'].includes(run.status)) {
                this.emit('thinking', { run });
            } else if (run.status === 'requires_action') {
                try {
                    // fetch messages before and after so we don't have to wait to see them
                    await this._fetchMessages();
                    run = await this._takeAction(run);
                    await this._fetchMessages();
                } catch (error) {
                    console.error('Run failed, cancelling');
                    run = await this.beta.threads.runs.cancel(this.thread.id, run.id);
                    break;
                }
            } else {
                break;
            }
            // sleep a little so we're not just hammering the api
            await new Promise((r) => setTimeout(r, 500));
        }
        this.emit('done_thinking', { run });
        await this._fetchMessages();
        return { run };
    }

    async _takeAction(run) {
        let tool_outputs = [];
        for (let call of run.required_action.submit_tool_outputs.tool_calls) {
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
                let arg = JSON.parse(call.function.arguments);
                const result = await f(arg);
                tool_outputs.push({
                    tool_call_id: call.id,
                    output: JSON.stringify(result),
                });
            } catch (ex) {
                console.error(`Error running command ${call.function.name}(${call.function.arguments})`);
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
        return this.beta.threads.runs.submitToolOutputs(this.thread.id, run.id, { tool_outputs });
    }

    async cancelOutstanding() {
        const { data } = await this.beta.threads.runs.list(this.thread.id);
        if (data) {
            for (let run of data) {
                if (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
                    console.log(`Cancelling ${run.id}`);
                    await this.beta.threads.runs.cancel(this.thread.id, run.id);
                }
            }
        }
    }
}

export default Dialog;
