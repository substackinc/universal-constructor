import chokidar, { watch } from 'chokidar';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
export const UC_DIR = path.resolve(path.dirname(__filename), '..');

let changedPaths = {};
let watcher;

await setupWatcher();

async function setupWatcher() {
    if (watcher) {
        changedPaths = {};
        await watcher.close();
    }
    watcher = chokidar.watch('.', {
        ignored: ['.git', '.idea', 'node_modules'],
        ignoreInitial: true,
    }).on('all', (event, path) => {
        //console.log(event, path);
        changedPaths[path] = { path, event, timestamp: +new Date() };
    });
}

export async function chdir(directory) {
    process.chdir(directory);
    await setupWatcher();
}

export function getFileChanges(since = 0) {
    const changes = [];
    for (let path of Object.keys(changedPaths)) {
        if (changedPaths[path].timestamp > since) {
            changes.push(changedPaths[path]);
        }
    }
    changes.sort((a, b) => a.timestamp - b.timestamp);
    return changes;
}

const verbs = {
    'change': 'changed the file',
    'add': 'added the file',
    'unlink': 'deleted the file',
};

export function getFileChangeSummary(since = 0, events = ['change', 'add', 'unlink']) {
    let changes = getFileChanges(since);
    let summary = [];

    for (let c of changes) {
        if (events.includes(c.event)) {
            summary.push(verbs[c.event] + ' ' + c.path);
        }
    }
    return summary;
}
