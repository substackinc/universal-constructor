import test from 'ava';
import Dialog from '../src/dialog.js';

const dialog = new Dialog({ apiKey: 'dummy' });

test('_parseToolArguments handles valid JSON', (t) => {
    const input = '{"key": "value"}';
    const expectedOutput = { key: 'value' };
    const result = dialog._parseToolArguments(input);
    t.deepEqual(result, expectedOutput);
});

test('_parseToolArguments handles JSON with extra trailing brace', (t) => {
    const input = '{"key": "value"}}';
    const expectedOutput = { key: 'value' };
    const result = dialog._parseToolArguments(input);
    t.deepEqual(result, expectedOutput);
});

test('_parseToolArguments throws SyntaxError on invalid JSON', (t) => {
    const input = '{"key": "value"';
    t.throws(
        () => {
            dialog._parseToolArguments(input);
        },
        { instanceOf: SyntaxError }
    );
});
