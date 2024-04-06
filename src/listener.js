import './config.js';
import { EventEmitter } from 'events';
import VAD from 'node-vad';
import mic from 'mic';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileEncoder } from 'flac-bindings';

class Listener extends EventEmitter {
    constructor() {
        super();
        this.openai = new OpenAI();
        this.micInstance = null;
        this.samplerate = 16000; //44100;
    }

    async start() {
        this.micInstance = mic({
            rate: this.samplerate,
            channels: 1,
            debug: false,
            exitOnSilence: 6,
            device: 'default'
        });

        const inputStream = this.micInstance.getAudioStream();
        const vadStream = VAD.createStream({
            mode: VAD.Mode.VERY_AGGRESSIVE,
            audioFrequency: this.samplerate,
            debounceTime: 2000,
        });

        inputStream.pipe(vadStream).on('data', this.handleData.bind(this));
        this.micInstance.start();
    }

    stop() {
        if (this.micInstance) {
            this.micInstance.stop();
            this.micInstance = null;
        }
    }

    pause() {
        //console.log("CBTEST pause");
        this.paused = true;
        if (this.file) {
            this.fileEncoder.end();
            this.fileEncoder = null;
            fs.unlink(this.file, err => err && console.error(err));
            this.file = null;
        }
    }

    resume() {
        //console.log("CBTEST resume");
        this.paused = false;
    }

    async handleData({ audioData, speech }) {
        if (this.paused) {
            return;
        }
        //console.log(speech);
        if (speech.start) {
            this.emit('start', speech);
            this.file = path.join(os.tmpdir(), `listener-${Date.now()}.flac`);
            this.fileEncoder = new FileEncoder({
                file: this.file,
                bitsPerSample: 16,
                channels: 1,
                samplerate: this.samplerate
            })
            this.maxRms = 0;
            this.maxDb = -99999;
            // trying this: write one chunk of data from before, so we don't miss the initial sound.
            if (this.lastData) {
                this.fileEncoder.write(this.lastData);
            }
        } else if (speech.end && this.fileEncoder) {
            speech.maxRms = this.maxRms;
            speech.maxDb = this.maxDb;
            this.emit('end', speech);
            const finishedFile = this.file;
            this.fileEncoder.end();
            this.fileEncoder = null;
            this.file = null;
            let transcription = await this.getTranscription(finishedFile);
            fs.unlink(finishedFile, err => err && console.error(err));

            if (this.isThisJunk(transcription)) {
                this.emit('junk', transcription);
            } else {
                this.emit("text", transcription)
            }
        }

        if (speech.state && this.fileEncoder) {
            const {rms, db} = this.calculateVolume(audioData)
            this.maxRms = Math.max(this.maxRms, rms);
            this.maxDb = Math.max(this.maxDb, db);
            this.fileEncoder.write(audioData);
            this.lastData = null;
        } else {
            this.lastData = audioData;
        }
    }

    async getTranscription(fileName) {
        const transcription = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(fileName),
            model: 'whisper-1',
        });
        return transcription.text;
    }

    isThisJunk(transcription) {
        // for some reason it tends to spit out other languages when it hears noise
        // Regex to detect korean & russian characters
        //const unwantedCharsRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uD7B0-\uD7FF\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]/g;
        const unwantedCharsRegex = /[^\u0000-\u007F0-9.,?!@#$%^&*()_+]/g;
        if (unwantedCharsRegex.test(transcription)) {
            return true;
        }

        if(transcription.startsWith('https://"') || transcription.startsWith('www.')) {
            return true;
        }

        const junkPhrases = [
            'Pfft.',
            'Thank you.',
            'Thank you for watching!',
            'Thank you for watching.',
            'Thanks for watching!',
            'Thanks for watching.',
            'Bye-bye.',
            'Bye. Bye.',
            'Bye.',
            'Cheers!',
            'Thank you so much for having us. Appreciate it.',
            'If you enjoyed this video, please like it and subscribe to my channel!',
            "If you enjoyed this video, please like it and subscribe to my channel.",
            "Transcribed by https://otter.ai"
        ]
        if (junkPhrases.includes(transcription)) {
            return true;
        }

        return false;
    }

    calculateVolume(audioData) {
        let sumSquare = 0;
        for (let i = 0; i < audioData.length; i += 2) {
            // Read two bytes at a time
            let sample = audioData.readInt16LE(i);
            sumSquare += sample * sample;
        }

        let rms = Math.sqrt(sumSquare / (audioData.length / 2));
        let db = 20 * Math.log10(rms / 32768);

        return { rms, db };
    }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    console.log(`Listener run directly, lets test it`);
    const l = new Listener();
    l.on('start', () => console.log('speech started'));
    l.on('end', ({duration, maxRms, maxDb}) => {
        console.log('speech ended', duration, maxRms, maxDb)
    });
    l.on('text', console.log);
    l.on('junk', (text) => console.log("JUNK", text));
    l.start();
}

export default Listener;
