import ansiEscapes from 'ansi-escapes';
import { marked } from 'marked';
import * as stream from 'stream';
import { markedTerminal } from 'marked-terminal';

marked.use(
    markedTerminal({
      width: process.stdout.columns - 1,
      reflowText: true,
      tab: 2,
    }),
);

class TerminalMarkdownStreamer {
    constructor() {
        this._stream = process.stdout;
        this._inputBuffer = '';
        this._outputBuffer = '';
    }

    write(text) {
        this._inputBuffer += text;
        let prevLines = this._outputBuffer.split('\n').length-1;
        this._outputBuffer = this.#transform(this._inputBuffer);
        process.stdout.write(ansiEscapes.cursorTo(0) + ansiEscapes.eraseLine);

      for (let i = 0; i < prevLines; i++) {
        process.stdout.write(ansiEscapes.cursorUp(1) + ansiEscapes.eraseLine);
      }
      process.stdout.write(this._outputBuffer);
    }

    flush() {
        this._inputBuffer = '';
        this._outputBuffer = '';
    }

    #transform(text) {
        return marked(text).trimEnd();
    }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    const streamer = new TerminalMarkdownStreamer();
    streamer.write('Hello, **world**!\n\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    streamer.write('Hello, **univ');
    await new Promise(resolve => setTimeout(resolve, 1000));
    streamer.write('erse**!\n\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    streamer.write('```html\n<example>\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    streamer.write('foo\n</example> ```\n\n');
}