import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const challengesDir = path.join(__dirname);
const outputPatterns = ['output.txt', 'output.js', 'output/'];

fs.readdirSync(challengesDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .forEach(dirent => {
    const challengeDir = path.join(challengesDir, dirent.name);
    outputPatterns.forEach(pattern => {
      const fullPatternPath = path.join(challengeDir, pattern);
      if (fs.existsSync(fullPatternPath)) {
        if (fs.lstatSync(fullPatternPath).isDirectory()) {
          fs.rmdirSync(fullPatternPath, { recursive: true });
          console.log(`Removed directory: ${fullPatternPath}`);
        } else {
          fs.unlinkSync(fullPatternPath);
          console.log(`Removed file: ${fullPatternPath}`);
        }
      }
    });
  });

console.log('Cleanup completed.');
