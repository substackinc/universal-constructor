import DialogBase from './dialogBase.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import * as util from 'util';

dotenv.config();

class AnthropicDialog extends DialogBase {
    constructor({ model = 'claude-3-5-sonnet-20240620'} = {}) {
        super();
        this.client = null;
        this.model = model;
        this.stream = false; // TODO: make streaming work.
        this.client = new Anthropic(process.env.ANTHROPIC_API_KEY);
    }

    async* streamCompletion(messages) {
        throw new Error("TODO: Implement");
        /*
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
        }*/
    }

    async getCompletion(messages) {

        let res;

        try {
            res = await this.client.messages.create({
                model: this.model,
                max_tokens: 2000,
                system: fs.readFileSync(this.instructionsFile, 'utf8'),
                messages,
                tools: this.toolsAnthropicFormat(),
            });
        } catch (ex) {
            console.error('Error in getCompletion:', ex);
            console.log(util.inspect(messages, {depth: null}));

            throw ex;
        }

        let textContents = res.content.filter(c => c.type === 'text');
        let toolContents = res.content.filter(c => c.type === 'tool_use');

        let text = textContents.map(c => c.text).join('\n');
        let tool_calls = this.toolUseToToolCalls(toolContents);

        let translatedMessage = {
            role: res.role,
            content: text,
        };
        if (tool_calls.length > 0) {
            translatedMessage.tool_calls = tool_calls;
        }

        let reasonTranslation = {
            end_turn: 'stop',
            tool_use: 'tool_calls'
        }

        return {
            finish_reason: reasonTranslation[res.stop_reason] || res.stop_reason,
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

            let translated = this.oai2anthropic(m);
            if (!translated) {
                continue;
            }

            if (p && p.role === translated.role) {
                p.content = [...p.content, ...translated.content];
            } else {
                alternating.push(translated);
            }
        }
        return alternating;
    }

    oai2anthropic(message) {
        switch(message.role) {
            case 'user':
            case 'assistant':
                let r = { role: message.role }

                if (typeof message.content === 'string') {
                    r.content = [{
                        type: 'text',
                        text: message.content
                    }];
                } else if (Array.isArray(message.content)) {
                    r.content = message.content.map(c => {
                       if (c.type === 'image_url') {
                           //console.log("CBTEST c=", c);
                           return {
                               type: 'image',
                               source: {
                                   type: 'base64',
                                   media_type: 'image/jpeg',
                                   data: c.image_url.url.split(',')[1],
                               },
                           }
                       } else {
                           return c;
                       }
                    });
                } else {
                    throw new Error('Unknown content type: ' + message.content);
                }

                if (message.tool_calls) {
                    r.content = [...r.content, ...message.tool_calls.map(tc => ({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.function.name,
                        input: JSON.parse(tc.function.arguments)
                    }))];
                }
                return r;
            case 'tool':
                return {
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: message.tool_call_id,
                        content: message.content
                    }]
                }
            case 'system':
                // Anthropic can't deal with these
                return null;
            default:
                throw new Error('Unknown role: ' + message.role);
        }
    }

    toolsAnthropicFormat() {
        /*  OpenAI format:
        [
            {
              type: 'function',
              function: {
                name: 'editFile',
                description: 'Replaces a specific substring within a file. Will replace the first instance after the start of the specified unique search context.',
                parameters: {
                  type: 'object',
                  properties: {
                    filepath: {
                      type: 'string',
                      description: 'The relative path to the file where the replacement should occur.'
                    },
                    uniqueContext: {
                      type: 'string',
                      description: 'The context that shows where in the file to start looking'
                    },
                  },
                  required: [ 'filepath', 'uniqueContext', 'exactTarget', 'replacements' ]
                }
              }
            }
        ]
        */
        /* Anthropic format:
        [
          {
            "name": "get_weather",
            "description": "Get the current weather in a given location",
            "input_schema": {
              "type": "object",
              "properties": {
                "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA"
                }
              },
              "required": ["location"]
            }
          }
        ]   ,
       */

        return this.tools.map(t => ({
           name: t.function.name,
           description: t.function.description,
           input_schema: t.function.parameters
        }));
    }

    toolUseToToolCalls(contents) {
        /* Anthropic:
            {
              "type": "tool_use",
              "id": "toolu_01A09q90qw90lq917835lq9",
              "name": "get_weather",
              "input": {"location": "San Francisco, CA"}
            }
         */
        /* OpenAI:
            {
              "id": "toolu_01A09q90qw90lq917835lq9",
              type: 'function',
              function: {
                name: 'get_weather',
                arguments: {"location": "San Francisco, CA"}
              }
            }
         */
        return contents.map(c => ({
            id: c.id,
            type: 'function',
            function: {
                name: c.name,
                arguments: JSON.stringify(c.input)
            }
        }));
    }
}

export default AnthropicDialog;
