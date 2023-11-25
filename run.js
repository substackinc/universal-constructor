import { spawn } from 'child_process';

function start() {
    // use --no-deprecation until openai fixes their fetch/punycode shit
    const process = spawn('node', ['--no-deprecation', 'src/repl.js'], { stdio: 'inherit' });

    process.on('exit', (code) => {
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
