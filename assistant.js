import {toolsDict, tools} from "./tools.js";
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import EventEmitter from 'events';
const messageEventEmitter = new EventEmitter();
await dotenv.config();

const openai = new OpenAI();
let lastMessageId = null;
const assistantId = 'asst_UuYztVsuHatsvpFOcZK43kLN';
const name = 'UC';
const instructions = fs.readFileSync('instructions.txt', 'utf8');
const description = 'UC, the Universal Constructor assistant, is your companion for coding and problem-solving.';
export { messageEventEmitter, name, description };

export async function updateAssistant() {
    return openai.beta.assistants.update(
        assistantId,
        {
            instructions,
            name,
            description,
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

export async function cancelOutstandingRuns(threadId) {
    //console.log("Cancelling outstanding runs.");
    const runs = await openai.beta.threads.runs.list(threadId);
    if (runs.data) {
        for (let run of runs.data) {
            // console.log("CBTEST", run.id, run.status);
            if (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
                console.log(`Cancelling ${run.id}`);
                await openai.beta.threads.runs.cancel(threadId, run.id);
            }
        }
    }
}

export async function sendMessageAndLogReply(threadId, content) {
    let message = await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: content
    });
    lastMessageId = message.id;

    let run = await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });

    // Wait for the run to be completed
    while (true) {
        run = await openai.beta.threads.runs.retrieve(threadId, run.id);
        switch (run.status) {
            case 'in_progress':
            case 'queued':
                process.stdout.write('.')
                break;
            case 'cancelling':
            case 'cancelled':
                process.stdout.write('\n');
                break;
            case 'requires_action':
            case 'completed':
                process.stdout.write('\n');
                break;
            default:
                console.log("Unexpected status:", run.status);
                break;
        }

        if (!['queued', 'in_progress', 'cancelling', 'requires_action'].includes(run.status)) {
            break;
        }
        if (run.status === "requires_action") {
            let tool_outputs = [];

            for (let call of run.required_action.submit_tool_outputs.tool_calls) {
                if (call.type !== 'function' || !toolsDict[call.function.name]) {
                    console.error('unknown tool call', call);
                    throw new Error('unknown tool call', call)
                }
                let f = toolsDict[call.function.name];
                try {
                    let arg = JSON.parse(call.function.arguments);
                    const result = await f(arg)
                    tool_outputs.push({
                        tool_call_id: call.id,
                        output: JSON.stringify(result)
                    })
                } catch (ex) {
                    console.error(`Error running command ${call.function.name}(${call.function.arguments})`);
                    console.error(ex);
                    tool_outputs.push({
                        tool_call_id: call.id,
                        output: JSON.stringify({
                            success: false,
                            error_message: `Running this tool failed. ${ex.toString()}`
                        })
                    })
                }
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

    await fetchMessages(threadId);
}

export async function fetchMessages(threadId, limit=10) {
    const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        before: lastMessageId,
        limit
    });

    lastMessageId = messages.body.first_id;
    let messageList = messages.data.toReversed();

    for (let message of messageList) {
        let content = message.content.map(c=>c.text.value).join('\n') || "NO RESPONSE";
        messageEventEmitter.emit("message", { role: message.role, content })
    }
}
