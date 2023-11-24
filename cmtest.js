import Dialog from "./src/Dialog.js";
import dotenv from 'dotenv';

await dotenv.config();

let cm = new Dialog()

cm.on('message', ({role, content}) => console.log(`@${role}: ${content}`));
cm.on('thinking', ({run}) => console.log('thinking', run.status));
cm.on('done_thinking', ({run}) => console.log('done_thinking', run.status));

console.log('CBTEST Setup');
await cm.setup({threadFile: '.threadTess', assistantFile: '.assistantTest'});

console.log("CBTEST Send");
await cm.processMessage('Just testing some stuff');

