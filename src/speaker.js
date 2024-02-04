import fs from 'fs';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import playSound from 'play-sound';
import path from 'path';
import os from 'os';
dotenv.config();
const openai = new OpenAI();
const player = playSound();

const play = (file) => new Promise((resolve, reject) => {
    player.play(file, (err) => {
        if (err) reject(err);
        else resolve('Audio playback finished!');
    });
});

async function speak(text, truncate=200) {

    if (truncate > 0 && text.length > truncate) {
        // last para
        text = text.split('\n').pop();

        while (text.length > truncate) {
            let sentences = text.split('. ');
            if (sentences.length > 1) {
                text = sentences.slice(1).join('. ');
            }
            else {
                // be brutal
                text = text.slice(-truncate)
            }
        }
    }
    //console.log('CBTEST truncate', truncate, text);

    const speechFile = path.join(os.tmpdir(), 'uc.mp3');
    const mp3 = await openai.audio.speech.create({
        model: "tts-1-hd",
        voice: "onyx",
        input: text,
        speed: 1.5,
        stream: true
    });

    // might be slightly faster to stream?
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
    await play(speechFile);
    fs.unlinkSync(speechFile);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    console.log(`Speaker run directly, lets test it`);
    await speak("The quick brown fox jumps over the lazy dog.")
}

export default speak;