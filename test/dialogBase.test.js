import test from 'ava';
import DialogBase from '../src/dialogBase.js';

test('DialogBase: _parseToolArguments handles valid JSON', (t) => {
  const dialog = new DialogBase();
  const input = '{"key": "value"}';
  const expectedOutput = { key: 'value' };
  const result = dialog.parseToolArguments(input);
  t.deepEqual(result, expectedOutput);
});

test('DialogBase: _parseToolArguments handles JSON with extra trailing brace', (t) => {
  const dialog = new DialogBase();
  const input = '{"key": "value"}}';
  const expectedOutput = { key: 'value' };
  const result = dialog.parseToolArguments(input);
  t.deepEqual(result, expectedOutput);
});

test('DialogBase: _parseToolArguments throws SyntaxError on invalid JSON', (t) => {
  const dialog = new DialogBase();
  const input = '{"key": "value"';
  t.throws(
    () => {
      dialog.parseToolArguments(input);
    },
    { instanceOf: SyntaxError }
  );
});
