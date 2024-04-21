import test from 'ava';
import getScreenshot from '../../src/tools/getScreenshot.js';

test('captures a screenshot', async t => {
  const screenshot = await getScreenshot();
  t.truthy(screenshot, 'Screenshot should not be empty');
});