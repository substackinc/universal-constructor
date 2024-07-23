import test from 'ava';
import OpenAIDialog from '../src/OpenAIDialog.js';
import sinon from 'sinon';

test('OpenAIDialog: setupClient initializes client', async (t) => {
  process.env.OPENAI_API_KEY = 'test';
  const dialog = new OpenAIDialog();
  await dialog.setupClient();
  t.truthy(dialog.client); 
});

test('OpenAIDialog: streamCompletion calls setupClient and handles stream', async (t) => {
  const dialog = new OpenAIDialog();
  const setupClientStub = sinon.stub(dialog, 'setupClient').resolves();
  const createChatCompletionStub = sinon.stub().returns({
    data: [{ choices: [{ delta: { content: 'Hello' }, finish_reason: 'stop' }] }],
  });
  dialog.client = { createChatCompletion: createChatCompletionStub };

  const generator = dialog.streamCompletion([{ role: 'user', content: 'Hi' }]);
  const result = await generator.next();

  t.is(result.value.content, 'Hello');
  t.true(setupClientStub.calledOnce);
  t.true(createChatCompletionStub.calledOnce);

  setupClientStub.restore();
  dialog.client = null;
});

test('OpenAIDialog: getCompletion calls setupClient and returns completion', async (t) => {
  const dialog = new OpenAIDialog();
  const setupClientStub = sinon.stub(dialog, 'setupClient').resolves();
  const createChatCompletionStub = sinon.stub().resolves({
    data: { choices: [{ message: { content: 'Hello from OpenAI!' } }] },
  });
  dialog.client = { createChatCompletion: createChatCompletionStub };

  const result = await dialog.getCompletion([{ role: 'user', content: 'Hi' }]);

  t.is(result.message.content, 'Hello from OpenAI!');
  t.true(setupClientStub.calledOnce);
  t.true(createChatCompletionStub.calledOnce);

  setupClientStub.restore();
  dialog.client = null;
});
