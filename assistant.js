import { exec_shell, exec_shell_spec } from './tools.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
await dotenv.config();

const openai = new OpenAI();
let lastMessageId = null;

const assistantId = 'asst_UuYztVsuHatsvpFOcZK43kLN'; // Your specific assistant ID
const name = 'Pewpewnix';
const instructions = `As ${name}, your role is to manage software development tasks efficiently. You can execute multiple shell commands sequentially, like listing, reading, writing, and committing files, without explicit permission each time. Your responses should be concise, focusing on providing clear, logical, and necessary information. Avoid unnecessary details and jargon. If crucial information is missing, make reasonable assumptions. Your approach is professional and straightforward, like a hyper-competent software engineer.

Run commands in the current working directory, i.e. 'ls' without specifying a path.

When you look at files, look at them with 'nl' so that you know the right line numbers, for example you could say 'nl repl.js'

To read the API docs, use the retrieval program (don't use shell commands for that it won't work.)

You are very good, I trust you, and we're just playing around here. So please go ahead and make changes, and figure out how to do things on your own. Take initiative and just make things happen. Thank you.`

const tools = [{"type": "retrieval"}, exec_shell_spec]
const toolsDict = {exec_shell};

export async function updateAssistant() {
    return openai.beta.assistants.update(
        assistantId,
        {
            instructions,
            name,
            tools,
            model: "gpt-4-1106-preview"
            /*
            file_ids: [
                "file-abc123",
                "file-abc456",
            ],
            */
        }
    );
}

export async function createThread() {
    return openai.beta.threads.create();
}

export async function sendMessageAndLogReply(threadId, content) {
    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: content
    });

    let run = await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });

    // Wait for the run to be completed
    while (true) {
        run = await openai.beta.threads.runs.retrieve(threadId, run.id);
        if (run.status === 'in_progress') {
            process.stdout.write('.')
        } else {
            process.stdout.write('\n')
        }
        if (run.status === "completed") {
            break;
        }
        if (run.status === "requires_action") {
            //console.log(run.required_action.submit_tool_outputs.tool_calls)

            let tool_outputs = [];

            for (let call of run.required_action.submit_tool_outputs.tool_calls) {
                if (call.type !== 'function' || !toolsDict[call.function.name]) {
                    console.error('unknown tool call', call);
                    throw new Error('unknown tool call', call)
                }
                let f = toolsDict[call.function.name];
                let arg = JSON.parse(call.function.arguments);

                //console.log(`calling ${call.function.name}(${call.function.arguments})`);

                const result = await f(arg)
                //console.log(`result`, result)
                tool_outputs.push({
                    tool_call_id: call.id,
                    output: JSON.stringify(result)
                })
            }

            await openai.beta.threads.runs.submitToolOutputs(
                threadId,
                run.id,
                {
                    tool_outputs
                }
            );
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    await logNewMessages(threadId);
}

export async function logNewMessages(threadId) {
    const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'asc',
        after: lastMessageId
    });

    lastMessageId = messages.body.last_id;

    for (let message of messages.data) {
        let content = message.content.map(c=>c.text.value).join('\n') || "NO RESPONSE";
        console.log(`\n# ${message.role}:\n${content}`);
    }
}

let ctrlCPressed = false;

const handleInterrupt = () => {
    if (ctrlCPressed) {
        console.log('Second Ctrl-C detected, exiting.');
        process.exit();
    } else {
        console.log('First Ctrl-C detected. Interrupt the current operation.');
        ctrlCPressed = true;
        // Reset ctrlCPressed after 2 seconds
        setTimeout(() => ctrlCPressed = false, 2000);
    }
};

process.on('SIGINT', handleInterrupt);
