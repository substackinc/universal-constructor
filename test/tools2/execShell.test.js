import test from 'ava';
import execShell from '../../src/tools2/execShell.js';

test('execShell executes a command successfully', async (t) => {
    const result = await execShell({ command: 'echo "hello world"' });
    t.deepEqual(result, {
        success: true,
        exitCode: 0,
        stdout: 'hello world\n',
        stderr: '',
    });
});

test('execShell handles an invalid command', async (t) => {
    const result = await execShell({ command: 'command-that-does-not-exist' });
    t.false(result.success);
    t.truthy(result.stderr);
});
