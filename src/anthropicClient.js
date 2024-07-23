import Anthropic from "@anthropic-ai/sdk";
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testAnthropicClient() {
  const msg = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 1000,
    temperature: 0,
    system: "Respond only with short poems.",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Why is the ocean salty?"
          }
        ]
      }
    ]
  });
  console.log(msg);
}

testAnthropicClient();
