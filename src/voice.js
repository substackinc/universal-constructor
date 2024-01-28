import VAD from 'node-vad';
import mic from 'mic';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import { FileEncoder } from 'flac-bindings';

const vad = new VAD(VAD.Mode.VERY_AGGRESSIVE);
let rate = 44100; // 16000;

dotenv.config();
const openai = new OpenAI();

const micInstance = mic({
    rate,
    channels: 1,
    debug: false,
    exitOnSilence: 6,
});
const inputStream = micInstance.getAudioStream();

const vadStream = VAD.createStream({
    mode: VAD.Mode.VERY_AGGRESSIVE,
    audioFrequency: 16000,
    debounceTime: 2000,
});

inputStream.pipe(vadStream).on('data', handleData);
micInstance.start();

process.on('SIGINT', end);
process.on('SIGTERM', end);

let currentFileName = null;
let currentFileEncoder = null;
let currentSpeechStarted = false;

function handleData({ time, audioData, speech }) {
    console.log(time, speech)
    return;
    if (speech.start && !currentSpeechStarted) {
        console.log('Speech started');
        currentSpeechStarted = true;
        currentFileName = `./tmp/audio-${Date.now()}.flac`;
        currentFileEncoder = new FileEncoder({
            file: currentFileName,
            bitsPerSample: 16,
            channels: 1,
            samplerate: rate,
        });
        currentFileEncoder.write(audioData);
    } else if (!speech.state && currentSpeechStarted) {
        console.log('Speech ended', time, speech);
        currentSpeechStarted = false;
        if (currentFileEncoder) {
            currentFileEncoder.end();  // This will finalize writing to the file.
            currentFileEncoder = null;
            let f = currentFileName;
            currentFileName = null;

            if (speech.duration < 800) {
                console.log('too short, ignoring');
            } else {
                handleSpeech(f);
            }
        }
    } else if (currentSpeechStarted) {
        currentFileEncoder.write(audioData);  // Continue writing to the same file as long as speech continues.
    }
}

async function handleSpeech(fileName) {
    console.log('getting transcription for file file', fileName);
    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(fileName),
        model: 'whisper-1',
    });
    console.log(transcription.text);
}


function end() {
    micInstance.stop();
}


