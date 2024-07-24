import DialogBase from './dialogBase.js';
import OpenAI from 'openai';

class OpenAIDialog extends DialogBase {
  constructor() {
    super();
    this.model = process.env.UC_MODEL || 'gpt-4o';
    this.stream = true;
    this.client = new OpenAI(process.env.OPENAI_API_KEY);
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
      tools: this.tools,
      tool_choice: 'auto',
    });

    for await (const chunk of completion) {
      if (shouldCancel) {
        yield { content: '... [cancelled]\n' };
        break;
      }
      if (chunk.choices[0]?.finish_reason) {
        if (chunk.choices[0].finish_reason !== 'stop' && chunk.choices[0].finish_reason !== 'function_call') {
          console.error('\nFinish reason: ' + chunk.choices[0].finish_reason);
        } else {
          yield chunk.choices[0]?.delta || '\n';
        }
        break;
      } else {
        yield chunk.choices[0]?.delta;
      }
    }
  }

  async getCompletion(messages) {
    await this.setupClient();
    this.cancelStream && this.cancelStream();

    const completion = await this.client.createChatCompletion({
      model: this.model,
      messages: messages,
      tools: this.tools,
      tool_choice: 'auto',
    });

    return completion.data.choices[0];
  }

  async cancelOutstanding() {
    this.cancelStream && this.cancelStream();
  }
}

export default OpenAIDialog;
