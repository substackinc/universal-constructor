import fs from 'fs';
import path from 'path';

const filePath = path.join(path.dirname(process.argv[1]), 'output.txt');

if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.trim() === 'Hello World!') {
        console.log('Success: the file contains the correct string.');
        process.exit(0); // Success
    } else {
        console.error('Error: the file does not contain the correct string.');
        process.exit(1);
    }
} else {
    console.error('Error: the file does not exist in this directory.');
    process.exit(1);
}
