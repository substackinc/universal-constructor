// src/tools/findFiles.js
import { execMulti } from './execShell.js';

findFiles.spec = {
    name: 'findFiles',
    description: 'Finds candidate files based on search criteria',
    parameters: {
        type: 'object',
        properties: {
            searchString: {
                type: 'string',
                description: 'The string to search for within files'
            }
        }
    }
};

export default async function findFiles({ searchString }) {
    return {
        shell_results: await execMulti(
            `git ls-files | grep -i "${searchString}"`,
            `grep -R i"${searchString}" --exclude-dir=node_modules .`
        )
    }
}
