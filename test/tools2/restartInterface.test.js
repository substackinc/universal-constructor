import test from 'ava';
import sinon from 'sinon';
import restartInterface from '../../src/tools2/restartInterface.js';

test.serial.beforeEach(t => {
  // Mock process.exit before each test
  t.context.exitStub = sinon.stub(process, 'exit');
});

test.serial.afterEach.always(t => {
  // Restore the original process.exit after each test
  t.context.exitStub.restore();
});

test.serial('restartInterface calls process.exit with status code 0', t => {
  restartInterface();
  // Assert that process.exit has been called with status code 0
  t.true(t.context.exitStub.calledWith(0));
});
