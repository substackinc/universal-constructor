**WARNING**: This software can execute shell commands, potentially modifying system files or state. It should **not** be run on any system with production access or any system with sensitive data.

---

# Universal Constructor

The Universal Constructor Assistant, nicknamed UC, is an AI-powered coding assistant and problem-solver designed to intelligently interact with developers, streamline workflows, and automate tasks. UC leverages OpenAI's models to provide real-time assistance.

[Here's my post about open-sourcing it.](https://cb.substack.com/p/open-sourcing-my-universal-constructor)

[![Demo of the Universal Constructor](https://img.youtube.com/vi/H2xBElbrvnU/0.jpg)](https://www.youtube.com/watch?v=H2xBElbrvnU)

## Getting Started

### Prerequisites

-   Node.js
-   npm (Node Package Manager)

### Installation and Setup

1. Clone the repository to your local machine.
2. Install the required npm packages:

```sh
npm install
```

3. Set up your environment variables by creating a `.env` file in the root of the project with the following content:

```sh
OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with your [actual OpenAI API key](https://platform.openai.com/api-keys).

4. Set up your ~/.zshrc to save shared history (So UC can see what you do between runs)

```sh
# Save history as we go
setopt INC_APPEND_HISTORY
setopt EXTENDED_HISTORY
setopt SHARE_HISTORY
export HISTSIZE=1000
export SAVEHIST=1000
```

### Running the Assistant

To start the assistant, run:

```bash
node run.js
```

The `run.js` script will manage the spawning of the assistant and its threading mechanism, ensuring continuity and automatic restarts on clean exits.

## Usage

```
$ node run.js

╔═════════════════════════════════════════╗
║ Welcome to the Universal Constructor!   ║
║ ‾‾‾‾‾‾‾                                 ║
║ ctrl+c to cancel/restart                ║
║ /reset gets you a fresh thread          ║
║ you gotta hit enter twice               ║
║                                         ║
║ have fun <3                             ║
╚═════════════════════════════════════════╝
Updating assistant...

This is the start of a brand new thread!

@chrisbest:
> Hi! Can you take a look around and give me a very brief description of what we're
> up to here?
>

@UC:
Hey there! We're working on the Universal Constructor project, which is basically
the code for me, your AI-powered coding assistant. The project's priorities right
now include making the edit functionality morerobust, simplifying the tools code,
and eventually letting me make changes end-to-end, from description to
tested and merged pull requests.

@chrisbest:
> Great! Can you do an impressive little demo for me?
>

@UC:
Sure thing! How about we do something coding related, like writing a tiny JavaScript
utility function, writetests for it, and then run the tests to demonstrate that it
works correctly? Let's create a simple functionthat adds two numbers and then test
it. I'll handle it all right now.

Writing to src/utils/addNumbers.js
Writing to test/utils/addNumbers.test.js
Executing shell command $  mkdir -p src/utils && mkdir -p test/utils
Writing to src/utils/addNumbers.js
Writing to test/utils/addNumbers.test.js
Executing shell command $  npm test test/utils/addNumbers.test.js
24s

@UC:
I created a simple utility function addNumbers that adds two numbers together, along
with a few tests to verify its correctness. The tests pass, confirming the
function works as intended:

   ✔ adds two numbers
    ─

    1 test passed

That's our impressive little demo! Function written, tested, and verified. Ready for
the next task!

```
