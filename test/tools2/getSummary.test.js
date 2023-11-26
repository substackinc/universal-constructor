import test from 'ava';
import getSummary from '../../src/tools2/getSummary.js';

// This test relies on the actual environment and the commands to be present

test('getSummary provides a summary object with the necessary keys', async (t) => {
    const summary = await getSummary();

    t.truthy(summary.advice, 'Summary should have an advice key');
    t.truthy(summary.shell_results, 'Summary should have a shell_results key');

    // Checking that all shell commands have run
    t.truthy(summary.shell_results['cat priorities.md'], 'Should have cat priorities.md results');
    t.truthy(summary.shell_results['cat priorities.md'].stdout, 'Should have stdout for icat priorities.md');
    t.is(summary.shell_results['cat priorities.md'].exitCode, 0, 'Exit code 0');
    t.truthy(summary.shell_results['git ls-files'], 'Should have git ls-files results');
    t.truthy(summary.shell_results['git status'], 'Should have git status results');
    t.truthy(summary.shell_results['git log -n 5'], 'Should have git log -n 5 results');
    t.truthy(summary.shell_results['cat package.json'], 'Should have cat package.json results');
    // t.truthy(summary.shell_results['prettier-check'], 'Should have prettier --check . results');
});
