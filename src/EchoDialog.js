import DialogBase from './dialogBase.js';

class EchoDialog extends DialogBase {
  constructor() {
    super();
    this.stream = true;
  }

  async* streamCompletion(messages) {
    const userMessage = messages[messages.length-1];
    if (userMessage) {
      const response = `Echo: ${userMessage.content}`;
      let streamDelay = 100; // milliseconds
      for (let i = 0; i < response.length; i += 3) {
        await new Promise(resolve => setTimeout(resolve, streamDelay));
        yield { content: response.substring(i, i + 3) };
      }
    }
  }

  async getCompletion(messages) {
    const userMessage = messages[messages.length-1];
    return { role: 'assistant', content: `Echo: ${userMessage.content}` };
  }

  async cancelOutstanding() {
    console.log('No outstanding processes to cancel for EchoDialog');
  }
}

export default EchoDialog;
