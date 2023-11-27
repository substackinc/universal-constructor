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
                pattern: '^/(.*?)/([gimy]*)$', // A regex pattern to validate the regex parameter itself
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
    required: ['regex', 'filepath', 'replacement'],
    type: 'object',
    additionalProperties: false,
};

export default async function regexReplace({ regex, filepath, replacement, dryRun = false }) {
    console.log("Regex replace in", filepath, regex)
    try {
        const absolutePath = path.resolve(filepath);
        let fileContent = fs.readFileSync(absolutePath, 'utf-8');

        const regExp = new RegExp(regex, 'g');
        const matches = fileContent.match(regExp) || [];

        const newContent = fileContent.replace(regExp, replacement);

        if (!dryRun) {
            fs.writeFileSync(absolutePath, newContent, 'utf-8');
        }

        return {
            success: true,
            filepath: absolutePath,
            originalContent: fileContent,
            updatedContent: dryRun ? null : newContent,
            matchCount: matches.length,
            matches: matches.map(match => ({ found: match })),
        };
    } catch (error) {
        return { success: false, error_message: error.message };
    }
}
