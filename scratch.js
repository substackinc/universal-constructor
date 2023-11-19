import OpenAI from "openai";
import dotenv from 'dotenv';
await dotenv.config();

const openai = new OpenAI();

async function main() {
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        model: "gpt-4-1106-preview",
    });

    console.log(completion.choices[0]);
}

main();