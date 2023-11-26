// src/tools2/restartInterface.js

restartInterface.spec = {
    name: restartInterface.name,
    description: 'Restarts the interface, using the current state of tools and configurations.',
    parameters: {
        type: 'object',
        properties: {},
    },
};

export default function restartInterface() {
    // This will exit the process in a real scenario
    process.exit(0);
}
