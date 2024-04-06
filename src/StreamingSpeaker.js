import EventEmitter from 'events';
import { OpenAI } from 'openai';
import playSound from 'play-sound';
import path from 'path';
import os from 'os';
import fs from 'fs';

const openai = new OpenAI();
const player = playSound();

class StreamingSpeaker extends EventEmitter {
    constructor() {
        super();
        this.buffer = '';
        this.transcriptionBuffer = [];
        this.playbackQueue = [];
        this.isTranscribing = false;
        this.isPlaying = false;
        this.sentenceBoundaryRegex = /[.?!]\s/;
    }

    write(content) {
        this.buffer += content;
        this.checkForSentence();
    }

    checkForSentence() {
        const sentenceEnd = this.buffer.search(this.sentenceBoundaryRegex);
        if (sentenceEnd !== -1) {
            const sentence = this.buffer.slice(0, sentenceEnd + 1);
            this.buffer = this.buffer.slice(sentenceEnd + 2);
            this.transcriptionBuffer.push(sentence);
            this.run();
        }
    }

    run() {
        this.runTranscription().catch((err) => console.error('Error transcribing', err));
        this.runPlayback().catch((err) => console.error('Error playing', err));
    }

    async runTranscription() {
        if (this.isTranscribing || this.transcriptionBuffer.length === 0) return;
        this.isTranscribing = true;
        let text = this.transcriptionBuffer.join('');
        this.transcriptionBuffer = [];
        let file = await textToAudioFile(text);
        this.playbackQueue.push(file);
        this.isTranscribing = false;

        process.nextTick(() => this.run());
    }

    async runPlayback() {
        if (this.isPlaying || this.playbackQueue.length === 0) return;
        this.emit('startSpeaking');
        this.isPlaying = true;
        let file = this.playbackQueue.shift();
        await playAudioFile(file);
        this.isPlaying = false;
        this.emit('doneSpeaking');

        process.nextTick(() => this.run());
    }
}

async function textToAudioFile(text) {
    let filename = `uc-${Date.now()}.mp3`;
    const speechFile = path.join(os.tmpdir(), filename);
    const mp3 = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'onyx',
        input: text,
        speed: 1.5,
        stream: true,
    });
    // might be slightly faster to stream?
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);

    return speechFile;
}

const play = (file) => new Promise((resolve, reject) => {
    player.play(file, (err) => {
        if (err) reject(err);
        else resolve('Audio playback finished!');
    });
});


async function playAudioFile(file) {
    await play(file);
    fs.unlink(file, err => err && console.error(err));
    return;
}

export default StreamingSpeaker;
