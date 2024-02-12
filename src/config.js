import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const dotenvFile = path.resolve(path.dirname(__filename), '../.env');
dotenv.config({ path: dotenvFile });
