import DialogBase from './dialogBase.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

class AnthropicDialog extends DialogBase {
    constructor() {
        super();
        this.client = null;
        this.model = process.env.UC_MODEL || 'claude-3-5-sonnet-20240620';
        this.stream = false; // TODO: make streaming work.
        this.client = new Anthropic(process.env.ANTHROPIC_API_KEY);
    }

    async* streamCompletion(messages) {
        await this.setupClient();
        const completion = await this.client.createCompletion({
            model: this.model,
            prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant: ',
            maxTokensToSample: 100,
            stopSequences: ['\nuser:', '\nassistant:'],
            stream: true,
        });

        for await (const chunk of completion.data) {
            if (chunk.choices[0].finishReason) {
                if (chunk.choices[0].finishReason !== 'stop') {
                    console.error('Finish reason:', chunk.choices[0].finishReason);
                }
                break;
            } else {
                yield chunk.choices[0].delta;
            }
        }
    }

    async getCompletion(messages) {

        const res = await this.client.messages.create({
            model: this.model,
            max_tokens: 2000,
            system: fs.readFileSync(this.instructionsFile, 'utf8'),
            messages: messages.filter(m => ['user', 'assistant'].includes(m.role)),
        });

        console.log(res);

        let translatedMessage = {
            role: res.role,
            content: res.content[0].text,
        };
        console.log(translatedMessage);
        return {
            finish_reason: res.stop_reason == 'end_turn' ? 'stop' : res.stop_reason,
            message: translatedMessage
        };
    }

    async cancelOutstanding() {
        console.log('No outstanding processes to cancel for AnthropicDialog');
    }

    stripDialog(messages) {
        messages = super.stripDialog(messages);

        // can't handle system messages.
        messages.filter(m => ['user', 'assistant'].includes(m.role));

        // must alternate back and forth between user and assistant
        let alternating = [];
        while (messages.length > 0) {
            let m = messages.shift();
            let p = alternating[alternating.length - 1];
            if (p && p.role === m.role) {
                p.content += '\n' + m.content;
            } else {
                alternating.push(m);
            }
        }

        // translate to Anthropic format
        return alternating.map(m => ({
            role: m.role,
            content: [{
                type: 'text',
                text: m.content,
            }],
        }));
    }
}

export default AnthropicDialog;
