import Dialog from "./Dialog.js";
import dotenv from 'dotenv';
import readline from "readline";
import chalk from "chalk";
import {marked} from 'marked';
import TerminalRenderer from 'marked-terminal';

marked.setOptions({
  renderer: new TerminalRenderer()
});

dotenv.config();
let dialog;
let rl;

async function main() {
    printWelcome();

    dialog = new Dialog()

    dialog.on('message', handleMessage);
    dialog.on('thinking', handleThinking);
    dialog.on('done_thinking', handleDoneThinking);

    await dialog.setup();

    rl = await setupReadline({
        '/rs': () => process.exit(0),
        '/cancel': async () => await dialog.cancelOutstanding()
    });

    prompt();
}

function setupReadline(commands) {
    let inputBuffer = [];
    let working = false;
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "> ",
        terminal: true
    })

    async function submit() {
        let input = inputBuffer.join('\n');
        inputBuffer = [];
        rl.pause();
        try {
            working = true
            await handleInput(input);
        } finally {
            working = false
        }

    }

    rl.on('line', async (line) => {
        if (line === '') {
            // two enters in a row
            await submit();
        } else if (line.endsWith('go')) {
            inputBuffer.push(line.slice(0, line.length - 2));
            await submit();
        } else if (commands[line]) {
            await commands[line]();
        } else {
            inputBuffer.push(line)
            rl.prompt();
        }
    })

    rl.on('close', () => {
        console.log('Quitting. (rl close)');
        process.exit(1);
    })

    let lastKillTime = +new Date();
    rl.on('SIGINT', async() => {
        console.log("CBTEST rl SIGINt");
        let t = +new Date();
        if (t - lastKillTime < 1000) {
            // twice in rapid succession. Let's die for real.
            rl.close();
        } else {
            lastKillTime = t;
            if (working) {
                // we're in the middle of a run. Let's cancel it.
                await dialog.cancelOutstanding();
            } else {
                // otherwise lets exit cleanly so we can be restarted if appropriate
                process.exit(0);
            }
        }
    });

    return rl;
}

function prompt() {
    console.log(chalk.cyan(`\n@${process.env.USER}:`));
    rl.prompt();
}

async function handleInput(input) {
    await dialog.processMessage(input);
    prompt();
}

function handleMessage({role, content}) {
    if (role === 'user') {
        console.log(chalk.cyan(`\n@${process.env.USER}:`), '\n' + marked(content));
    } else {
        console.log(chalk.green(`\n@${dialog.assistant.name}:`), '\n' + marked(content));
    }
}

function handleThinking() {
    process.stdout.write('.');
}

function handleDoneThinking() {
    process.stdout.write('\n');
}

function printWelcome() {
    console.log('\n');
    console.log("╔═════════════════════════════════════════╗")
    console.log("║ Welcome to the Universal Constructor!   ║")
    console.log("║ ‾‾‾‾‾‾‾                                 ║")
    console.log("║ /rs restarts the repl                   ║")
    console.log("║ /cancel cancels any outstanding runs    ║")
    console.log("║ ctrl-c does both (hit it twice to quit) ║")
    console.log("║                                         ║")
    console.log("║ have fun <3                             ║")
    console.log("╚═════════════════════════════════════════╝")
}

// run the main function
await main();
