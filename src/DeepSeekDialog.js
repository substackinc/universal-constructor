import OpenAIDialog from './OpenAIDialog.js';
import { OpenAI } from 'openai';


export default class DeepSeekDialog extends OpenAIDialog {
    constructor(model='deepseek-reasoner') {
        super({
            model,
            client: new OpenAI({
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseURL: "https://api.deepseek.com",
            }),
            stream: true
        });
    }

    async setup({ threadFile = '.thread', instructionsFile = 'instructions.md' } = {}) {
        await super.setup({ threadFile, instructionsFile });

        // reasoner doesn't support tools yet, delete here so that we can talk to it
        this.tools = null;
    }
}