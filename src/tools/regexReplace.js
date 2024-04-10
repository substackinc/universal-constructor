import fs from 'fs';
import path from 'path';

regexReplace.spec = {
    name: regexReplace.name,
    description: 'Replaces content in a file matching a regex pattern.',
    parameters: {
        type: 'object',
        properties: {
            regex: {
                type: 'string',
                description: 'The regex pattern to use for matching, including flags, like /foo/gi.',
                pattern: '^/(.*?)/([gimsuvy]*)$', // A regex pattern to validate the regex parameter itself
            },
            filepath: {
                type: 'string',
                description: 'The relative path to the file where the replacement should occur.',
            },
            replacement: {
                type: 'string',
                description: 'The string to replace with (can be multiple lines).',
            },
            dryRun: {
                type: 'boolean',
                description: 'If true, return the would-be changes but do not actually change the file.',
                default: false,
            },
        },
        required: ['filepath', 'regex', 'replacement'],
    },
};

export default async function regexReplace({ regex, filepath, replacement, dryRun = false }) {
    try {
        if (typeof regex !== 'string') {
            throw new Error('regex needs to be a string');
        }
        const absolutePath = path.resolve(filepath);
        let fileContent = fs.readFileSync(absolutePath, 'utf-8');

        const regexParts = regex.match(/^\/(.*?)\/([gimsuvy]*)$/);
        if (!regexParts) {
            throw new Error('Regex is not provided in the correct format.');
        }

        const [_, pattern, flags] = regexParts;
        const regExp = new RegExp(pattern, flags);
        const matches = fileContent.match(regExp) || [];

        const newContent = fileContent.replace(regExp, replacement);
        if (!dryRun) {
            fs.writeFileSync(absolutePath, newContent, 'utf-8');
        }

        return {
            success: true,
            filepath: absolutePath,
            originalContent: fileContent,
            updatedContent: newContent,
            fileUpdated: !dryRun,
            matchCount: matches.length,
            matches: matches.map((match) => ({ found: match })),
        };
    } catch (error) {
        return { success: false, error_message: 'Regex replace error: ' + error.message };
    }
}
