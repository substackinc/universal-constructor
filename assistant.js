import {toolsDict, tools} from "./tools.js";
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
await dotenv.config();

const openai = new OpenAI();
let lastMessageId = null;

const assistantId = 'asst_UuYztVsuHatsvpFOcZK43kLN';
const name = 'Super Coder';
const instructions = fs.readFileSync('instructions.txt', 'utf8');

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

export async function cancelOustandingRuns(threadId) {
    console.log("Cancelling outstanding runs. Ctrl-C again to exit.")
    const runs = await openai.beta.threads.runs.list(threadId);
    if (runs.data) {
        for (let run of runs.data) {
            //console.log('CBTEST', run.id, run.status);
            if (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
                console.log(`Found outstanding run, cancelling ${run.id}}`);
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
                process.stdout.write('X');
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
            //console.log(run.required_action.submit_tool_outputs.tool_calls)

            let tool_outputs = [];

            for (let call of run.required_action.submit_tool_outputs.tool_calls) {
                if (call.type !== 'function' || !toolsDict[call.function.name]) {
                    console.error('unknown tool call', call);
                    throw new Error('unknown tool call', call)
                }
                let f = toolsDict[call.function.name];

                try {
                    let arg = JSON.parse(call.function.arguments);
                    //console.log(`calling ${call.function.name}(${call.function.arguments})`);
                    const result = await f(arg)
                    //console.log(`result`, result)
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

    await logNewMessages(threadId);
}

export async function logNewMessages(threadId) {
    const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        before: lastMessageId,
        limit: 5
    });

    lastMessageId = messages.body.first_id;
    let messageList = messages.data.toReversed();

    if (messages.body.has_more) {
        console.log("\n(Previous messages not shown)");
    }

    for (let message of messageList) {
        let content = message.content.map(c=>c.text.value).join('\n') || "NO RESPONSE";
        console.log(`\n @ ${message.role}:\n\n${content}`);
    }
}
