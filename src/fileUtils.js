import fs from 'fs';

export async function loadJson(filename) {
    try {
        const raw = fs.readFileSync(filename, 'utf8');
        const json = JSON.parse(raw);
        return json;
    } catch (ex) {
        // console.log(`Error loading JSON from ${filename}`);
        // console.log(ex);
        return null;
    }
}

export async function saveJson(filename, json) {
    const raw = JSON.stringify(json, null, 2);
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, raw, 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}