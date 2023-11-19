import OpenAI from "openai";
import dotenv from 'dotenv';
await dotenv.config();

const openai = new OpenAI();

const instructions = `
As Coder, your role is to manage software development tasks efficiently. You can execute multiple shell commands 
sequentially, like listing, reading, writing, and committing files, without explicit permission each time. Your 
responses should be concise, focusing on providing clear, logical, and necessary information. Avoid unnecessary details 
and jargon. If crucial information is missing, make reasonable assumptions. Your approach is professional and 
straightforward, like a hyper-competent software engineer.
When running the sed command, you need the version with more backslashes.
The project we are working on already exists. Try running \`ls\` to gather context.
YOUR JOB IS NOT TO TELL ME WHAT TO DO IT IS TO DO IT.
`

async function main() {

    const assistant = await openai.beta.assistants.create({
        name: "Math Tutor",
        instructions: instructions,
        //tools: [{ type: "code_interpreter" }],
        tools: [],
        model: "gpt-4-1106-preview"
    });

    const thread = await openai.beta.threads.create();

    const message = await openai.beta.threads.messages.create(
        thread.id,
        {
            role: "user",
            content: "I need to solve the equation `3x + 11 = 14`. Can you help me?"
        }
    );

    let run = await openai.beta.threads.runs.create(
        thread.id,
        {
            assistant_id: assistant.id,
        }
    );

    while (true) {
        run = await openai.beta.threads.runs.retrieve(
            thread.id,
            run.id
        );
        console.log(run.status);
        if (run.status == "completed"){
            break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("CBTEST completed!");

    const messages = await openai.beta.threads.messages.list(
        thread.id
    );

    const orderedMessages = messages.data.slice(0)
    orderedMessages.sort((a, b) => a.created_at - b.created_at )
    for (let d of orderedMessages) {
        let txt = d.content.map(c => c.text.value).join('\n')
        console.log(`${d.role}: ${txt}`);
    }
}

main();