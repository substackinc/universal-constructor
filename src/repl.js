import './config.js';
import readline from 'readline';
import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { unlinkSync, existsSync } from 'fs'; // Added existsSync
import cliSpinners from 'cli-spinners';
import path from 'path';
import { parseZshHistory } from './tools/history.js';
import { getFileChangeSummary, UC_DIR } from './dirUtils.js';
import Listener from './listener.js';
import speak from './speaker.js';
import minimist from 'minimist';
import RevisableTerminalWriter from './RevisableTerminalWriter.js';
import StreamingSpeaker from './StreamingSpeaker.js';
import openAIDialog from './OpenAIDialog.js';
import EchoDialog from './EchoDialog.js';
import AnthropicDialog from './AnthropicDialog.js';
import GroqDialog from './GroqDialog.js';
import PushListener from './pushListener.js';
import { GlobalKeyboardListener } from 'node-global-key-listener';
import XaiDialog from './XaiDialog.js';
import DeepSeekDialog from './DeepSeekDialog.js';

marked.use(
    markedTerminal({
        width: Math.min(80, process.stdout.columns - 5),
        reflowText: false,
        tab: 2,
    }),
);

const chalk1 = chalk.cyan.bold;
const chalk2 = chalk.hex('#fcad01').bold;
const chalk3 = chalk.gray.bold;

let dialog;
let pushListener;
let rl;
let lastInput = +new Date();
let listener = null;
let working = false;
let shouldSpeak = false;
let shouldUpdate = false;

async function main() {
    const args = minimist(process.argv.slice(2), {
        string: ['api', 'model'],
        boolean: ['listen', 'speak', 'update', 'reset'],
        alias: { l: 'listen', s: 'speak', u: 'update', h: 'help', r: 'reset' },
        default: { listen: false, speak: false, updates: false},
    });
    // Handle --help option
    if (args.help) {
        printHelp();
        process.exit(1); // error code so that we don't restart
    }

    // Handle -r flag to start new thread
    if (args.reset) {
        const threadFile = path.resolve(UC_DIR, '.thread');
        if (existsSync(threadFile)) {
            unlinkSync(threadFile);
            console.log('Starting a new thread');
        }
    }

    printWelcome();

    if (args.speak) {
        shouldSpeak = true;
        console.log("Speech enabled");
    }
    if (args.update) {
        shouldUpdate = true;
        console.log("File and command updates enabled");
    }

    dialog = createDialog(args);

    dialog.on('message', handleMessage);
    dialog.on('start_thinking', handleStartThinking);
    dialog.on('chunk', handleChunk);
    dialog.on('done_thinking', handleDoneThinking);

    // If listen flag is true, start microphone listener
    if (args.listen) {
        await startListening();
    } else {
        setupPushToTalk()
    }

    await dialog.setup({
        threadFile: path.resolve(UC_DIR, '.thread'),
        assistantFile: path.resolve(UC_DIR, '.assistant'),
        instructionsFile: path.resolve(UC_DIR, 'instructions.md'),
    });

    rl = await setupReadline({
        '/quit': () => process.exit(1),
        '/reset': async () => {
            console.log('Resetting');
            unlinkSync(path.resolve(UC_DIR, '.thread'));
            process.exit(0);
        },
        '/rs': () => process.exit(0),
        '/cancel': async () => await dialog.cancelOutstanding(),
    });

    prompt();
}

function createDialog({model, api}) {

    model = model || process.env.UC_MODEL;
    api = api || process.env.UC_API;

    // default anthropic model
    if (!model && api === 'anthropic') {
        model = 'claude-3-5-sonnet-20240620'
    }

    // default groq model
    if (!model && api === 'groq') {
        model = 'llama-3.1-70b-versatile';
    }

    // otherwise default to gpt-4o
    if (!model && (!api || api === 'openai')) {
        model = 'gpt-4o';
    }

    // guess API based on model name
    if (!api) {
        if (model.indexOf('gpt') !== -1 || model.indexOf('o1') !== -1) {
            api = 'openai';
        } else if (model.indexOf('claude') !== -1) {
            api = 'anthropic';
        } else if (model.indexOf('llama') !== -1) {
            api = 'groq';
        } else if (model.indexOf('grok') !== -1 || model.indexOf('xai') != -1) {
            api = 'xai';
        } else {
            throw new Error("Not sure which API to use for model: " + model);
        }
    }

    console.log(`Model: ${model} (${api})`)

    switch (api.toLowerCase()) {
        case 'openai':
            return new openAIDialog(model);
        case 'deepseek':
            return new DeepSeekDialog(model);
        case 'echo':
            return new EchoDialog();
        case 'anthropic':
            return new AnthropicDialog();
        case 'groq':
            return new GroqDialog();
        case 'x':
        case 'xai':
        case 'grok':
            return new XaiDialog(model || 'grok-beta');
        default:
            throw new Error('Unknown API: ' + process.env.UC_API);
    }
}

async function startListening() {
    listener = new Listener();
    listener.on('text', async (text) => {
        if (!text.trim()) {
            return;
        }
        //console.log("Transcribed:", text);
        await dialog.addMessage(text, {tag: 'transcribedVoice'});

        // have some special words that trigger us to send.
        let l = text.toLowerCase();
        if (!working && (l.endsWith("go") || l.endsWith("go.") || l.endsWith("go ahead.") || l.endsWith("please?") || l.endsWith("please.") || l.endsWith('over') || l.endsWith('over.'))) {
            working = true;
            if (shouldUpdate) {
                await dialog.addMessage(await getContextMessage());
            }
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


function setupPushToTalk() {
    const v = new GlobalKeyboardListener();
    console.log("Push-to-talk enabled. Press and hold the right Option key to speak.");
    pushListener = new PushListener();

    v.addListener(async function (e) {
        if (e.name === 'RIGHT ALT' && e.state === 'DOWN') {
            // Right Option key pressed
            pushListener.start();
        } else if (e.name === 'RIGHT ALT' && e.state === 'UP') {
            // Right Option key released
            startSpinner();
            let transcription = await pushListener.stop();
            if (transcription) {
                working = true;
                await dialog.addMessage(transcription);
                await dialog.processRun();
                working = false;
            } else {
                stopSpinner();
            }
            prompt();
        }
    });
}

function setupReadline(commands) {
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
                if (shouldUpdate) {
                    let contextMessage = await getContextMessage();
                    await dialog.addMessage(contextMessage);
                    handleMessage(contextMessage);
                }
                await dialog.processRun();
                prompt();
            } else {
                // don't fire the message event since we dont need to print it again
                await dialog.addMessage(line, {fire: false, allowCombining: true});
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
                //console.log('\nCancelling... (ctrl-d quits)');
                await dialog.cancelOutstanding();
            } else {
                // otherwise let's exit cleanly, so we can be restarted if appropriate
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

function handleChunk({ message, chunk }) {
    stopSpinner();
    let roleString = chalk2(`\n@${dialog.assistant.name}:`) + '\n';
    this.streamingWriter.writeToTerminal(roleString + marked(message.content).trimEnd());
    if (this.streamingSpeaker) {
        this.streamingSpeaker.write(chunk);
    }
}

function handleMessage({ role, content, summary, historic, streamed }) {
    if ((!content && !summary)) {
        return;
    }
    stopSpinner();

    if (Array.isArray(content)) {

        content = content.map(c => {
            if (c.type === 'text') {
                return c.text;
            } else if (c.type === 'image_url') {
                if (c.image_url.url.startsWith('data:')) {
                    return '[Image data url]';
                }
                return `![image](${c.image_url.url})`;
            } else {
                return `[UNKNOWN CONTENT TYPE ${c.type}]`;
            }
        }).join('\n\n');

    } else if (typeof content !== 'string') {
        content = 'UNKNOWN CONTENT ' + typeof content;
    }

    if (role === 'user') {
        console.log(chalk1(`\n@${dialog.userName}:`) + '\n' + marked(content).trimEnd());
    }
    else if (role === 'assistant' && !streamed) {

        let c = summary || marked(content).trimEnd();
        console.log(chalk2(`\n@${dialog.assistant.name}:`) + '\n' + c);
        if (!historic && shouldSpeak) {
            speak(content).then();
        }
    } else if (role === 'system' && summary) {
        console.log(chalk3(`\nsystem: ${summary}`));
    } else if (role === 'tool' && summary) {
        console.log(chalk3(`\ntool: ${summary}`));
    }
}

let cancelSpinner;

function startSpinner() {
    if (cancelSpinner) cancelSpinner();
    let s = cliSpinners.dots3;
    let i = 0;
    let spinnerStart = +new Date();
    let interval = setInterval(() => {
        process.stdout.write(chalk2(`\r ${s.frames[i++ % s.frames.length]} `));
    }, s.interval);

    cancelSpinner = () => {
        clearInterval(interval);
        let t = ((+new Date() - spinnerStart) / 1000).toFixed(0);
        process.stdout.write(`\r ${s.frames[i++ % s.frames.length]} ${t}s\n`);
        cancelSpinner = null;
    };
}

function stopSpinner() {
    if (cancelSpinner) cancelSpinner();
}

function handleStartThinking() {
    process.stdout.write('\n');
    this.streamingWriter = new RevisableTerminalWriter();
    if (shouldSpeak) {
        this.streamingSpeaker = new StreamingSpeaker();
        this.streamingSpeaker.on('startSpeaking', () => {
            if (listener) {
                listener.pause();
            }
        });
        this.streamingSpeaker.on('doneSpeaking', () => {
            if (listener) {
                listener.resume()
            }
        });
    }
    startSpinner();
}

function handleDoneThinking() {
    stopSpinner();
    this.streamingWriter = null;
    this.streamingSpeaker = null;
    process.stdout.write('\n');
}

async function getContextMessage() {
    const prevInput = lastInput;
    lastInput = +new Date();
    const maxAge = prevInput ? (lastInput - prevInput) / 1000 : 5 * 60;

    let time = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    let commandHistory = (await parseZshHistory(maxAge, 100)).map(c => c.command);
    let changedFiles = getFileChangeSummary(lastInput-maxAge*1000)

    let contextMessage = '<ContextInfo>\n';

    contextMessage += `time: ${time}\ncwd: ${process.cwd()}]\n`;

    if (commandHistory.length) {
        contextMessage += `\nRecent commands:\n${truncateFromStart(commandHistory).join('\n')}`;
    }
    if (changedFiles.length) {
        contextMessage += `\nChanged files:\n${truncateFromStart(changedFiles).join('\n')}\n`;
    }
    contextMessage += '</ContextInfo>';
    //console.log("CBTEST CONTEXT", contextMessage);
    return {
        role: 'system',
        content: contextMessage,
        summary: `Context @${time}, ${commandHistory.length} commands run, ${changedFiles.length} files changed`,
    }
}

function truncateFromStart(list, len=5) {
    if (list.length <= len) {
        return list;
    }
    return [ `...${list.length-len} not shown`, ...list.slice(list.length - len)];
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

function printHelp() {
    console.log(`Usage: uc [options]\n`);
    console.log(`Options:`);
    console.log(`  --listen, -l          Listen for voice input via microphone`);
    console.log(`  --speak, -s           Speak out the content`);
    console.log(`  --updates, -u         Watch file & command-line updates`);
    console.log(`  --help, -h            Display this help message and exit`);
    console.log(`  --model               Specify a model to use (default gpt-4o)`);
    console.log(`  --api                 openai, anthropic, groq, echo. Leave blank to guess based on model.`);
}

// run the main function
await main();
