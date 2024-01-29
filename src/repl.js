import Dialog from './dialog.js';
import dotenv from 'dotenv';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { unlinkSync } from 'fs';
import cliSpinners from 'cli-spinners';
import { fileURLToPath } from 'url';
import path from 'path';
import { getHistory, parseZshHistory } from './tools/history.js';
import { getFileChangeSummary } from './dirUtils.js';
import Listener from './listener.js';
import speak from './speaker.js';

const __filename = fileURLToPath(import.meta.url);
const ucDir = path.resolve(path.dirname(__filename), '..');
const dotenvFile = path.resolve(path.dirname(__filename), '../.env');

marked.use(
    markedTerminal({
        width: process.stdout.columns - 1,
        reflowText: true,
        tab: 2,
    }),
);

const chalk1 = chalk.cyan.bold;
const chalk2 = chalk.hex('#fcad01').bold;

dotenv.config({ path: dotenvFile });
let dialog;
let rl;
let lastInput = 0;
let listener = null;
let working = false;

async function main() {
    printWelcome();

    dialog = new Dialog();

    dialog.on('message', handleMessage);
    dialog.on('start_thinking', handleStartThinking);
    dialog.on('done_thinking', handleDoneThinking);

    await startListening();

    await dialog.setup({
        threadFile: path.resolve(ucDir, '.thread'),
        assistantFile: path.resolve(ucDir, '.assistant'),
        instructionsFile: path.resolve(ucDir, 'instructions.md'),
    });

    rl = await setupReadline({
        '/quit': () => process.exit(1),
        '/reset': async () => {
            console.log('Resetting');
            unlinkSync(path.resolve(ucDir, '.thread'));
            process.exit(0);
        },
        '/rs': () => process.exit(0),
        '/cancel': async () => await dialog.cancelOutstanding(),
    });

    prompt();
}

async function startListening() {
    listener = new Listener();
    listener.on('text', async (text) => {
        if (!text.trim()) {
            return;
        }
        console.log("Transcribed:", text);
        await dialog.addMessage(text, 'transcribedVoice');

        // have some special words that trigger us to send.
        let l = text.toLowerCase();
        if (!working && (l.endsWith("go") || l.endsWith("go.") || l.endsWith("go ahead.") || l.endsWith("please?") || l.endsWith("please."))) {
            working = true;
            await dialog.processRun();
            working = false;
        }

        if (!working) {
            prompt();
        }
    });
    await listener.start();
    console.log("Listening...")
}


function setupReadline(commands) {
    let inputBuffer = [];

    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
        terminal: true,
    });


    rl.on('line', async (line) => {
        try {
            working = true;
            if (commands[line]) {
                await commands[line]();
            } else if (line === '') {
                // empty line == go
                await dialog.processRun();
                prompt();
            } else {
                await dialog.addMessage(line);
                rl.prompt();
            }
        } finally {
            working = false;
        }
    });

    rl.on('close', () => {
        console.log('Quitting. (rl close)');
        process.exit(1);
    });

    let lastKillTime = +new Date();
    rl.on('SIGINT', async () => {
        let t = +new Date();
        if (t - lastKillTime < 1000) {
            // twice in rapid succession. Let's die for real.
            rl.close();
        } else {
            lastKillTime = t;
            if (working) {
                // we're in the middle of a run. Let's cancel it.
                console.log('\nCancelling... (ctrl-d quits)');
                await dialog.cancelOutstanding();
            } else {
                // otherwise lets exit cleanly so we can be restarted if appropriate
                console.log('\nRestarting... (ctrl-d quits)');
                process.exit(0);
            }
        }
    });

    return rl;
}

function prompt() {
    console.log(chalk1(`\n@${dialog.userName}:`));
    rl.prompt(true);
}

function handleMessage({ role, content, historic }) {
    let roleString;
    if (role === 'user') {
        roleString = chalk1(`\n@${dialog.userName}:`) + '\n';
    } else {
        roleString = chalk2(`\n@${dialog.assistant.name}:`) + '\n';
        if (!historic) {
            speak(content);
        }
    }
    let markedContent = marked(content).trimEnd();
    console.log(roleString + markedContent);
}

let cancelSpinner;

function handleStartThinking() {
    let s = cliSpinners.dots3;
    let i = 0;
    let spinnerStart = +new Date();
    process.stdout.write('\n');
    let interval = setInterval(() => {
        process.stdout.write(chalk2(`\r ${s.frames[i++ % s.frames.length]} `));
    }, s.interval);

    cancelSpinner = () => {
        clearInterval(interval);
        let t = ((+new Date() - spinnerStart) / 1000).toFixed(0);
        process.stdout.write(`\r ${s.frames[i++ % s.frames.length]} ${t}s\n`);
    };
}

function handleDoneThinking() {
    cancelSpinner && cancelSpinner();
}

function printWelcome() {
    console.log('\n');
    console.log('╔═════════════════════════════════════════╗');
    console.log('║ Welcome to the Universal Constructor!   ║');
    console.log('║ ‾‾‾‾‾‾‾                                 ║');
    console.log('║ ctrl+c to cancel/restart                ║');
    console.log('║ /reset gets you a fresh thread          ║');
    console.log('║ you gotta hit enter twice               ║');
    console.log('║                                         ║');
    console.log('║ have fun <3                             ║');
    console.log('╚═════════════════════════════════════════╝');
}

// run the main function
await main();
