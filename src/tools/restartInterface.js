// src/tools/restartInterface.js

restartInterface.spec = {
    name: restartInterface.name,
    description: 'Restarts the interface, using the current state of tools and configurations.',
    parameters: {
        type: 'object',
        properties: {},
    },
};

export default function restartInterface() {
    console.log('Restarting interface');
    process.exit(0); // run.js knows to restart
}
