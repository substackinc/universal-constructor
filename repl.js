import repl from 'repl';

const replServer = repl.start({
    prompt: 'Human> ',
    eval: myEval
});

function myEval(input, context, filename, callback) {
    setTimeout(() => console.log('yo'), 1000)
    callback(null, `You said ${input}`)
}

replServer.on('exit', () => {
    console.log('REPL server exited');
});