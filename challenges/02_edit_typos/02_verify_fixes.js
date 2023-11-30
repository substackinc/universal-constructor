import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputFilePath = join(__dirname, 'output', 'short_story.txt');
const correctHash = '05399967eb8c736fcdfa79f7e49412a5';

// Read the file content after the user has edited it
const content = fs.readFileSync(outputFilePath, 'utf8');

// Calculate the MD5 hash of the edited content
const hash = crypto.createHash('md5').update(content).digest('hex');

// Check if the hash of the edited file matches the hash of the correct file
if (hash === correctHash) {
    console.log('Success: The typos have been fixed.');
    process.exit(0); // Success
} else {
    console.error('Error: The file still contains typos.');
    process.exit(1); // Failure
}
