import VAD from 'node-vad';
import mic from 'mic';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import { FileEncoder } from 'flac-bindings'

const vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);
let rate = 44100 // 16000;
let file = `./tmp/audio-${Date.now()}.flac`;

dotenv.config();
const openai = new OpenAI();

const micInstance = mic({
    rate,
    channels: 1,
    debug: false,
    exitOnSilence: 6
});
const inputStream = micInstance.getAudioStream();

const vadStream = VAD.createStream({
    mode: VAD.Mode.NORMAL,
    audioFrequency: 16000,
    debounceTime: 2000
})

inputStream.pipe(vadStream).on('data', handleData);
inputStream.pipe(new FileEncoder({
    file,
    bitsPerSample: 16,
    channels: 1,
    samplerate: rate
}))

micInstance.start();

process.on('SIGINT', end)
process.on('SIGTERM', end)

function handleData({time, audioData, speech}){
    if (speech.start) {
        console.log("Speech started")
    }
    else if (speech.end) {
        console.log('Speech ended, duration:', speech)
    }
}


function end() {
    micInstance.stop();
}