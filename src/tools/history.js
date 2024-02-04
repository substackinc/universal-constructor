// src/tools/history.js
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

getHistory.spec = {
    name: getHistory.name,
    description: 'Retrieves a history of commands that the user has run recently',
    parameters: {
        type: 'object',
        properties: {
            maxAge: {
                type: 'integer',
                description: 'The max age (in seconds) of commands to see',
            },
            maxLines: {
                type: 'integer',
                description: 'The maximum number of lines to return',
            },
        },
        required: [],
    },
};

export async function getHistory({ maxAge = 15 * 60, maxLines = 25, quiet = false } = {}) {
    console.log(`Getting command history`, maxAge, maxLines);
    return {
        success: true,
        commandHistory: await parseZshHistory(maxAge, maxLines)
    };
}

export async function parseZshHistory(maxAge, maxLines) {
    try {
        let historyFilePath = process.env.HISTFILE || path.join(os.homedir(), '.zsh_history');
        //console.log('Reading history from', historyFilePath);
        const historyData = await fs.readFile(historyFilePath, { encoding: 'utf-8' });
        const lines = historyData.split('\n').filter(line => line && line.trim());
        let parsedHistory = [];
        const nowMs = +new Date();

        for (const line of lines) {
            // Extended history lines start with ": ", followed by the timestamp and duration
            let lastTimeSeen = 0;
            if (line.charAt(0) === ':') {
                let [,timestamp, str] = line.split(':');
                timestamp = timestamp.trim();
                let [, command] = str.split(';')

                const thenMs = parseInt(timestamp) * 1000;

                const secondsAgo = Math.round((nowMs - thenMs)/1000);
                parsedHistory.push({ command: command.trim(), secondsAgo });

                if (secondsAgo > maxAge) {
                    // if we see a line older than maxAge, we can get rid of it and everything that came before
                    parsedHistory = [];
                }
            } else {
                // Lines without timestamp
                parsedHistory.push({ command: line });
            }
        }

        return parsedHistory.slice(-maxLines);
    } catch (ex) {
        console.error("Failed to grab zsh history", ex);
        return [];
    }
}