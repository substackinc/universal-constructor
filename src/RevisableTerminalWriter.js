import ansiEscapes from 'ansi-escapes';
import stringWidth from 'string-width';

class RevisableTerminalWriter {
    constructor() {
        this.prevLines = [];
    }

    async writeToTerminal(newText) {
        const newLines = newText.split('\n');

        let firstDiffIndex = -1;
        let controlChars = '';
        let newContent = '';

        for (let i = 0; i < this.prevLines.length; i++) {
            if (newLines[i] !== this.prevLines[i]) {
                firstDiffIndex = i;
                break;
            }
        }

        if (firstDiffIndex !== -1) {
            let linesBack = this.getRenderedLineCount(this.prevLines.slice(firstDiffIndex));

            controlChars += '\r';
            if (linesBack > 1) {
                controlChars += ansiEscapes.cursorUp(linesBack -1);
                //controlChars += `\x1b[${linesBack - 1}A`;
            }
            controlChars += '\r'
            controlChars += ansiEscapes.eraseDown + ansiEscapes.eraseLine;
            newContent = newLines.slice(firstDiffIndex).join('\n');
        } else if (newLines.length !== this.prevLines.length) {
            if (this.prevLines.length !== 0) {
                newContent += '\n';
            }
            newContent += newLines.slice(this.prevLines.length).join('\n');
        } else {
            // nothing changed
            return;
        }

        process.stdout.write(controlChars + newContent);
        this.prevLines = newLines;
    }

    getRenderedLineCount(lines) {
        let count = 0;
        for (let line of lines) {
            let w = stringWidth(line);
            count += w === 0 ? 1 : Math.ceil(w / process.stdout.columns);
        }
        return count;
    }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    const writer = new RevisableTerminalWriter();
    writer.writeToTerminal(`@UC:
Sure, I'd be glad to help with some code. Since you haven't specified what kind
of code or what it should do, I'll provide a simple example: a Python function
to check whether a given year is a leap year.
`);
    await sleep();
    writer.writeToTerminal(`@UC:
Sure, I'd be glad to help with some code. Since you haven't specified what kind
of code or what it should do, I'll provide a simple example: a Python function
to check whether a given year is a leap year.

`);
    await sleep();
    writer.writeToTerminal(`@UC:
Sure, I'd be glad to help with some code. Since you haven't specified what kind
of code or what it should do, I'll provide a simple example: a Python function
to check whether a given year is a leap year.

`);
    await sleep();
    writer.writeToTerminal(`@UC:
Sure, I'd be glad to help with some code. Since you haven't specified what kind
of code or what it should do, I'll provide a simple example: a Python function
to check whether a given year is a leap year.

  def is_lea
`);

}

async function sleep(ms = 2000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default RevisableTerminalWriter;
