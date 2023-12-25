import test from 'ava';
import getSummary from '../../src/tools/getSummary.js';

// This test relies on the actual environment and the commands to be present

test('getSummary provides a summary object with the necessary keys', async (t) => {
    const summary = await getSummary();

    t.truthy(summary.advice, 'Summary should have an advice key');
    t.truthy(summary.shell_results, 'Summary should have a shell_results key');

    // Checking that all shell commands have run
    // The following checks are commented out because the cat priorities.md command may not exist in all working directories
    t.truthy(summary.shell_results['cat *.md'], 'Should have cat *.md results');
    t.truthy(summary.shell_results['cat *.md'].stdout, 'Should have stdout for cat *.md');
    t.is(summary.shell_results['cat *.md'].exitCode, 0, 'Exit code 0');
    t.truthy(summary.shell_results['git ls-files'], 'Should have git ls-files results');
    t.truthy(summary.shell_results['git status -u'], 'Should have git status results');
    t.truthy(summary.shell_results['git log -n 5'], 'Should have git log -n 5 results');
    t.truthy(summary.shell_results['cat package.json'], 'Should have cat package.json results');
    // t.truthy(summary.shell_results['prettier-check'], 'Should have prettier --check . results');
});
