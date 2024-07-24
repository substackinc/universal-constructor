import screenshot from 'screenshot-desktop';
import { execShell } from './index.js';
import sharp from 'sharp';

getScreenshot.spec = {
    name: getScreenshot.name,
    description: 'Captures a screenshot of the entire screen or specified screen area, and optionally saves it to a file.',
    parameters: {
        type: 'object',
        properties: {
            options: {
                type: 'object',
                description: 'Options to control screenshot capture, such as screen ID',
                properties: {
                    screen: {
                        type: 'number',
                        description: 'Screen ID to capture.',
                    },
                },
            },
        },
        additionalProperties: false,
    },
};

export default async function getScreenshot(options = {}) {
    console.log(`Capturing screenshot. Options:`, JSON.stringify(options));
    try {
        const screenshotOptions = Object.assign({format: 'png'}, options);
        const img = await screenshot(screenshotOptions);
        //console.log('CBTEST original size: ', img.length);
        let resized =await sharp(img).jpeg({ mozjpeg: true }).toBuffer();
        //console.log('CBTEST new size: ', resized.length);

        let content = [
            { type: 'text', text: 'Screenshot captured successfully. Image to follow.' },
        ];

        content._userContent = [
            { type: 'text', text: 'Here is the screenshot you asked for.' },
            {
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${resized.toString('base64')}`,
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
