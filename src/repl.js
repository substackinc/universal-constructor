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

async function main() {
    printWelcome();

    dialog = new Dialog();

    dialog.on('message', handleMessage);
    dialog.on('start_thinking', handleStartThinking);
    dialog.on('done_thinking', handleDoneThinking);

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

function setupReadline(commands) {
    let inputBuffer = [];
    let working = false;
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> ',
        terminal: true,
    });

    async function submit() {
        let input = inputBuffer.join('\n');
        inputBuffer = [];
        try {
            working = true;
            await handleInput(input);
        } finally {
            working = false;
        }
    }

    rl.on('line', async (line) => {
        if (line === '' && inputBuffer.join('').trim() !== '') {
            // enter on a blank line submits
            await submit();
        } else if (commands[line]) {
            await commands[line]();
        } else {
            inputBuffer.push(line);
            rl.prompt();
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

async function handleInput(input) {
    const prevInput = lastInput;
    lastInput = +new Date();
    const maxAge = prevInput ? (lastInput - prevInput) / 1000 : 5 * 60;
    let recentUserChanges = [];

    // tell it if we've run any commands recently
    let commandHistory = await parseZshHistory(maxAge, 25);
    if (commandHistory.length) {
        recentUserChanges.push(`I've run ${commandHistory.length} shell commands.`);
    }

    // let it if we've changed any files recently
    recentUserChanges = recentUserChanges.concat(getFileChangeSummary(prevInput));

    if (recentUserChanges.length) {
        let interval = prevInput ? 'since last message' : 'recently';
        let changeText = recentUserChanges.map(c => ` - ${c}`).join('\n');
        let contextMessage = `[Automatic message] By thew way, ${interval}:\n${changeText}`;
        console.log(contextMessage);
        await dialog.processMessage(contextMessage, input);
    } else {
        await dialog.processMessage(input);
    }

    await dialog.processMessage();
    prompt();
}

function handleMessage({ role, content }) {
    let roleString;
    if (role === 'user') {
        roleString = chalk1(`\n@${dialog.userName}:`) + '\n';
    } else {
        roleString = chalk2(`\n@${dialog.assistant.name}:`) + '\n';
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
