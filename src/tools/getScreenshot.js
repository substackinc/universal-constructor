import screenshot from 'screenshot-desktop';
import { execShell } from './index.js';

getScreenshot.spec = {
    name: getScreenshot.name,
    description: 'Captures a screenshot of the entire screen or specified screen area, and optionally saves it to a file.',
    parameters: {
        type: 'object',
        properties: {
            options: {
                type: 'object',
                description: 'Options to control screenshot capture, such as screen ID, format, and filename.',
                properties: {
                    screen: {
                        type: 'number',
                        description: 'Screen ID to capture.',
                    },
                    format: {
                        type: 'string',
                        description: 'Image format (e.g., jpg, png).',
                    },
                    filename: {
                        type: 'string',
                        description: 'Full path to save the screenshot file.',
                    },
                },
            },
        },
        additionalProperties: false,
    },
};

export default async function getScreenshot(options = {}) {
    console.log(`Capturing screenshot.`);
    try {
        const img = await screenshot(options);

        let content = [
            { type: 'text', text: 'Screenshot captured successfully. Image to follow.' },
        ];

        content._userContent = [
            { type: 'text', text: 'Here is the screenshot you asked for.' },
            {
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${img.toString('base64')}`,
                },
            }];

        return content;
    } catch (error) {
        throw new Error('Failed to capture screenshot: ' + error.message);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await getScreenshot({ 'filename': 'test.png' });
    await execShell({ command: 'open test.png' });
}
