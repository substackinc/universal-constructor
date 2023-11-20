// assistant.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
import {exec} from "child_process";
await dotenv.config();

const workingDirectory = '/Users/chrisbest/src/gpts-testing'

const openai = new OpenAI();

const assistantId = 'asst_UuYztVsuHatsvpFOcZK43kLN'; // Your specific assistant ID
const name = 'Pewpewnix';
const instructions = `As ${name}, your role is to manage software development tasks efficiently. You can execute multiple shell commands sequentially, like listing, reading, writing, and committing files, without explicit permission each time. Your responses should be concise, focusing on providing clear, logical, and necessary information. Avoid unnecessary details and jargon. If crucial information is missing, make reasonable assumptions. Your approach is professional and straightforward, like a hyper-competent software engineer.
You are very good, I trust you, and we're just playing around here. So please go ahead and make changes, and figure out how to do things on your own. Take initiative and just make things happen. Thank you.`

const exec_shell_spec = {
    "type": "function",
    "function": {
        "name": "exec_shell",
        "description": "Run a command in a bash shell",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The zsh shell command to run"
                }
            },
            "required": [
                "location"
            ]
        }
    }
};
async function exec_shell(command) {
    console.log(`\n\n${new Date()} \nRunning command: ${command}`)
    exec(command, { cwd: workingDirectory}, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`)
            return {
                success: false,
                error: error.message
            }
        }
        if (stderr) {
            console.error(`Stderror: ${stderr}`)
            return {
                success: false,
                stderr: stderr
            }
        }
        console.log(`Output: ${stdout}`)
        return {
            success: true,
            stdout: stdout
        }
    });
}

const tools = [exec_shell_spec]
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
    const thread = await openai.beta.threads.create();
    return thread; // Return the thread object
}

export async function sendMessageAndGetReply(threadId, content) {
    console.log("CBTEST", content)
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
            console.error(`Woops, this requires action`)
            console.error(run)
            console.error(run.required_action)
            console.error(run.required_action.submit_tool_outputs.tool_calls)
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const orderedMessages = messages.data.sort((a, b) => a.created_at - b.created_at);
    return orderedMessages.find(msg => msg.role === "assistant")?.content.map(c => c.text.value).join('\n') || "No response from assistant.";
}