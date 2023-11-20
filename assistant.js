// assistant.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
await dotenv.config();

const openai = new OpenAI();

const assistantId = 'asst_UuYztVsuHatsvpFOcZK43kLN'; // Your specific assistant ID

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