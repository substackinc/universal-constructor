# Gym for Universal Constructor Challenges

The gym directory contains challenges and equipment to test and improve the capabilities of the Universal Constructor (UC).

## Structure

- `/equipment`: Contains reusable code files that simulate different codebases. These are used as starting points for challenges.
- `/arena`: This is where the active editing happens. Files from equipment are copied here and edited according to challenge instructions.
- `challenge_[number]_[description].js`: Each challenge is a standalone JavaScript file that defines tasks for the UC to accomplish using its tools.

## How It Works

1. A challenge file gets executed, which often involves copying a file from equipment to the arena.
2. The UC then makes a series of edits to the file in the arena as per the challenge's instructions.
3. Once editing is done, the challenge file runs tests to verify the success of the operations.
4. Challenges are designed to improve the reliability and capabilities of UC's tools incrementally.

## Cleaning the Arena

To clean the arena and remove all files from previous challenges, run the `clean-arena.js` script:

```bash
node gym/clean-arena.js
```