// src/tools2/restartInterface.js

restartInterface.spec = {
    name: 'restart_interface',
    description: 'Restarts the interface, using the current state of tools and configurations.',
    // No parameters needed for restartInterface
};

export default async function restartInterface() {
    // Tool implementation
    process.exit(0);
}
