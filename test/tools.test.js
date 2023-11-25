import test from 'ava';
import { exec_shell } from '../src/tools.js';

test('exec_shell executes a command successfully', async t => {
  const result = await exec_shell({ command: 'echo "hello world"' });
  t.is(result.stdout, 'hello world\n', 'stdout should contain the command output');
  t.is(result.exitCode, 0, 'exit code should be 0');
  t.deepEqual(result.stderr, '', 'stderr should be empty');
});

test('exec_shell handles an invalid command', async t => {
  const result = await exec_shell({ command: 'command-that-does-not-exist' });
  t.not(result.exitCode, 0, 'exit code should not be 0 for an invalid command');
});
