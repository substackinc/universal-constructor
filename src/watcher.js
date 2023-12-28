import chokidar from 'chokidar';

const changedPaths = {};

chokidar.watch('.', {
    ignored: ['.git', '.idea', 'node_modules'],
    ignoreInitial: true,
}).on('all', (event, path) => {
    //console.log(event, path);
    changedPaths[path] = { path, event, timestamp: +new Date() };
});

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
    'change': 'changed',
    'add': 'added',
    'unlink': 'deleted',
};

export function getFileChangeSummary(since = 0, events = ['change', 'add', 'unlink']) {
    let changes = getFileChanges(since);
    let summary = [];

    for (let c of changes) {
        summary.push(verbs[c.event] + ' ' + c.path);
    }
    return summary.join('\n');
}

// let t = +new Date();
// setInterval(() => {
//     console.log('File changes:', getFileChanges(t));
//     t = +new Date();
// }, 5000);