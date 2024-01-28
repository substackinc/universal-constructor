import { EventEmitter } from 'events';
import VAD from 'node-vad';
import mic from 'mic';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileEncoder } from 'flac-bindings';

class Listener extends EventEmitter {
    constructor() {
        super();
        dotenv.config();
        this.openai = new OpenAI();
        this.micInstance = null;
        this.samplerate = 44100;
    }

    async start() {
        this.micInstance = mic({
            rate: this.samplerate,
            channels: 1,
            debug: false,
            exitOnSilence: 6,
            //device: "Chris’s AirPods Max"
            device: 'default'
        });

        const inputStream = this.micInstance.getAudioStream();
        const vadStream = VAD.createStream({
            mode: VAD.Mode.VERY_AGGRESSIVE,
            audioFrequency: 16000,
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

    async handleData({ audioData, speech }) {
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
        } else if (speech.end) {
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

        if (speech.state) {
            const {rms, db} = this.calculateVolume(audioData)
            this.maxRms = Math.max(this.maxRms, rms);
            this.maxDb = Math.max(this.maxDb, db);
            this.fileEncoder.write(audioData);
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
        const unwantedCharsRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uD7B0-\uD7FF\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F]/g;
        if (unwantedCharsRegex.test(transcription)) {
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
