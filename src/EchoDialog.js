import DialogBase from './dialogBase.js';

class EchoDialog extends DialogBase {
  constructor() {
    super();
  }

  async processRun() {
    // For echo dialog, we simply repeat the last user's message
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage.role === 'user') {
      const response = { role: 'assistant', content: `Echo: ${lastMessage.content}` };
      this.messages.push(response);
      this.emit('message', response);
    }
    await this.save();
  }

  // Stub methods
  async* streamCompletion(messages) {
    const userMessage = messages.find(m => m.role === 'user');
    if (userMessage) {
      yield { content: `Echo: ${userMessage.content}` };
    }
  }

  async getCompletion(messages) {
    const userMessage = messages.find(m => m.role === 'user');
    return { role: 'assistant', content: `Echo: ${userMessage.content}` };
  }

  async cancelOutstanding() {
    console.log('No outstanding processes to cancel for EchoDialog');
  }
}

export default EchoDialog;
