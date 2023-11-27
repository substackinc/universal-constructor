import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const arenaPath = path.join(__dirname, 'arena');

fs.readdir(arenaPath, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.unlink(path.join(arenaPath, file), err => {
      if (err) throw err;
    });
  }
});
