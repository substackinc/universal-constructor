import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Create the output directory if it doesn't exist
const outputDir = join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Copy the story with typos to the output directory
const typoFilePath = join(__dirname, 'short_story.txt');
const outputFilePath = join(outputDir, 'short_story.txt');
fs.copyFileSync(typoFilePath, outputFilePath);

console.log('The story with typos has been copied to the output directory.');
console.log('Please fix the typos in ' + outputFilePath + ' to complete this challenge.');
