import Groq from 'groq-sdk';
import OpenAIDialog from './OpenAIDialog.js';

export default class GroqDialog extends OpenAIDialog {
    constructor({ model = 'llama3-70b-8192', client = new Groq() } = {}) {
        super({ model, client, stream: false });
    }
}