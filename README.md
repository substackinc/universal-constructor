**WARNING**: This software can execute shell commands, potentially modifying system files or state. It should **not** be run on any system with production access or any system with sensitive data.

---

# Universal Constructor Assistant

The Universal Constructor Assistant, nicknamed UC, is an AI-powered coding assistant and problem-solver designed to intelligently interact with developers, streamline workflows, and automate tasks. UC leverages OpenAI's models to provide real-time assistance.

## Getting Started

### Prerequisites

-   Node.js
-   npm (Node Package Manager)

### Installation and Setup

1. Clone the repository to your local machine.
2. Install the required npm packages:

```
npm install
```

3. Set up your environment variables by creating a `.env` file in the root of the project with the following content:

```
OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

### Running the Assistant

To start the assistant, run:

```bash
node run.js
```

The `run.js` script will manage the spawning of the assistant and its threading mechanism, ensuring continuity and automatic restarts on clean exits.

## Usage

UC will automatically save your thread between runs. To get a new one, delete your local `.thread` file.

Otherwise... talk to the thing. Tell it to make modifications. Let it debug itself. It sometimes stumbles over minor things, but it's often able to correct it's own errors.

Have fun!
