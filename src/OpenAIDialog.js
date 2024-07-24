import DialogBase from './dialogBase.js';
import OpenAI from 'openai';
import * as util from 'util';

class OpenAIDialog extends DialogBase {
    constructor({ model = 'gpt-4o', client = new OpenAI(process.env.OPENAI_API_KEY), stream = true } = {}) {
        super();
        this.model = model;
        this.stream = stream;
        this.client = client;
    }

    async* streamCompletion(messages) {
        this.cancelStream && this.cancelStream();
        let shouldCancel = false;
        let completion;
        this.cancelStream = () => {
            shouldCancel = true;
            this.cancelStream = null;
        };

        completion = await this.client.chat.completions.create({
            model: this.model,
            messages: messages,
            stream: true,
            stream_options: {
                include_usage: true
            },
            tools: this.tools,
            tool_choice: 'auto',
        });

        for await (const chunk of completion) {
            if (chunk.usage) {
                if (chunk.usage.prompt_tokens > 50000) {
                    console.log("\nUsage:", chunk.usage);
                }
                continue;
            }
            if (shouldCancel) {
                try {
                    completion.controller.abort();
                } catch (ex) {
                    console.error("Error aborting stream:", ex);
                }
                yield { content: '... [cancelled]\n' };
                break;
            }
            if (chunk.choices[0]?.finish_reason) {
                if (chunk.choices[0].finish_reason !== 'stop' && chunk.choices[0].finish_reason !== 'function_call') {
                    console.error('\nFinish reason: ' + chunk.choices[0].finish_reason);
                } else {
                    yield chunk.choices[0]?.delta || '\n';
                }
                //break;
            } else {
                yield chunk.choices[0]?.delta;
            }
        }
    }

    async getCompletion(messages) {
        this.cancelStream && this.cancelStream();

        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages: messages,
            tools: this.tools,
            tool_choice: 'auto',
        });

        if (completion.usage.prompt_tokens > 50000) {
            console.log("Usage:", completion.usage);
        }

        //console.log('CBTEST completion:', util.inspect(completion, { depth: null }));
        return completion.choices[0];
    }

    async cancelOutstanding() {
        this.cancelStream && this.cancelStream();
    }
}

export default OpenAIDialog;
