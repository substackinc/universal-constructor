import OpenAIDialog from './OpenAIDialog.js';
import { OpenAI } from 'openai';


export default class XaiDialog extends OpenAIDialog {
    constructor(model) {
        super({
            model,
            client: new OpenAI({
                apiKey: process.env.XAI_API_KEY,
                baseURL: "https://api.x.ai/v1",
            }),
            stream: false
        });
    }
}