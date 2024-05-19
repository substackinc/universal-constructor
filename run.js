#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Track if it's the first run
let firstRun = true;

function start() {
    // Set the terminal title
    console.log('\u001b]2;Universal Constructor\u0007');

    // Remove the -r or --reset flag if it's not the first run
    let args = process.argv.slice(2);
    if (!firstRun && (args.includes('-r') || args.includes('--reset'))) {
        args = args.filter(arg => ['--reset', '-r'].includes(arg) === false);
    }

    // use --no-deprecation until openai fixes their fetch/punycode shit
    const childProcess = spawn('node', [
        '--no-deprecation',
        `${__dirname}/src/repl.js`,
        ...args,
    ], { stdio: 'inherit' });

    childProcess.on('exit', (code) => {
        firstRun = false;
        if (code === 0) {
            console.log('Restarting. (Press ctrl-c twice to exit)');
            start();
        } else {
            console.log(`Exited with code ${code}. No restart`);
        }
    });
}

process.on('SIGINT', () => {
    // let repl.js handle this.
});

start(); // Start the process for the first time
