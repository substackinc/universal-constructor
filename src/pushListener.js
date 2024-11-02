import mic from 'mic';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileEncoder } from 'flac-bindings';

class PushListener {
    constructor() {
        this.openai = new OpenAI();
        this.micInstance = null;
        this.file = null;
        this.fileEncoder = null;
    }

    start() {
        this.stop(false);
        this.micInstance = mic({
            rate: 16000,
            channels: 1,
            debug: false,
            exitOnSilence: 6,
            device: 'default',
        });
        let m = this.micInstance;

        const inputStream = this.micInstance.getAudioStream();
        this.file = path.join(os.tmpdir(), `push_listener_${Date.now()}.flac`);

        this.fileEncoder = new FileEncoder({
            file: this.file,
            bitsPerSample: 16,
            channels: 1,
            samplerate: 16000,
        });

        inputStream.on('data', (data) => {
            if (m !== this.micInstance) {
                return;
            }
            this.fileEncoder.write(data);
        });

        this.micInstance.start();
    }

    async stop(transcribe = true) {
        if (this.micInstance) {
            this.micInstance.stop();
            this.fileEncoder.end();
            this.micInstance = null;

            let exists = fs.existsSync(this.file);
            let transcription = null
            if (transcribe && exists) {
                transcription = await this.getTranscription(this.file)
            }
            if (exists) {
                fs.unlink(this.file, (err) => {
                    if (err) console.error(err);
                });
            }
            return transcription;
        }
    }

    async getTranscription(fileName) {
        const transcription = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(fileName),
            model: 'whisper-1',
        });
        return transcription.text;
    }
}

export default PushListener;