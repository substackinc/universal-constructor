import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { exec, spawn, execSync } from 'child_process';
import fs from 'fs';

const app = express();
app.use(express.json()); // For parsing application/json
const port = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const workingDirectory = '/Users/chrisbest/src/gpts-testing'

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

app.post('/execute', (req, res) => {
  const command = req.body.command;

  console.log(`\n\n${new Date()} /execute1 \nRunning: ${command}`)
  exec(command, { cwd: workingDirectory}, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`)
      return res.status(500).send(`Error: ${error.message}`);
    }
    if (stderr) {
      console.error(`Stderror: ${stderr}`)
      return res.status(500).send(`Stderr: ${stderr}`);
    }
    console.log(`Output: ${stdout}`)
    res.status(200).send(`Output: ${stdout}`);
  });
});

app.post('/execute2', (req, res) => {
  const { command } = req.body;
  const args = req.body.args || req.body.arguments || [];

  console.log(`\n\n${new Date()} /execute2 \nRunning: ${command} ${args || {}}`)

  // Spawn the process
  const childProcess = spawn(command, args || [], { cwd: workingDirectory });

  let output = '';
  childProcess.stdout.on('data', (data) => {
    console.log(data.toString())
    output += data.toString();
  });

  childProcess.stderr.on('data', (data) => {
    console.error(data.toString())
    output += data.toString();
  });

  childProcess.on('error', (error) => {
    console.error(`Error: ${error.message}`);
    return res.status(500).send(`Error: ${error.message} \n ${output}`);
  });

  childProcess.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
    res.status(200).send(output);
  });
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(__dirname + '/privacy-policy.html');
});

app.get('/openapi', (req, res) => {
  res.sendFile(__dirname + '/openapi.json');
});

app.get('/read-files', async (req, res) => {
  try {
    const files = req.query.files.split(',');
    let fileContents = {};

    for (const file of files) {
      const filePath = path.join(workingDirectory, file);
      const data = await fs.promises.readFile(filePath, 'utf8');
      const lines = data.split('\n').map((line, index) => `${index + 1}: ${line}`);
      fileContents[file] = lines.join('\n');
    }

    res.json(fileContents);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error reading files');
  }
});

app.put('/write-file', async (req, res) => {
  try {
    const { file, content, lines } = req.body;
    console.log(`Editing ${file} ${lines}`)
    const filePath = path.join(workingDirectory, file);
    const data = await fs.promises.readFile(filePath, 'utf8');
    let fileLines = data.split('\n');

    if (lines) {
      const [start, end] = lines.split('-').map(Number);
      if (start === end) {
        // Insert logic
        fileLines.splice(start - 1, 0, content);
      } else {
        // Replace logic
        fileLines.splice(start - 1, end - start + 1, content);
      }
    } else {
      // Overwrite entire file if no lines are specified
      fileLines = [content];
    }

    await fs.promises.writeFile(filePath, fileLines.join('\n'), 'utf8');
    res.status(200).send('File updated successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating file');
  }
});

app.get('/', async (req, res) => {
  try {
    const filesSummary = {};
    const items = fs.readdirSync(workingDirectory);

    for (const item of items) {
      const itemPath = path.join(workingDirectory, item);
      const itemStats = fs.lstatSync(itemPath);

      if (itemStats.isFile()) {
        const data = fs.readFileSync(itemPath, 'utf8');
        const lines = data.split('\n');

        filesSummary[item] = {
          lineCount: lines.length,
          symbols: extractSymbols(data),
          summaryDocumentation: extractSummaryDocumentation(lines)
        };
      }
    }

    // Running git commands
    const gitStatus = execSync('git status', { cwd: workingDirectory }).toString();
    const gitDiff = execSync('git diff', { cwd: workingDirectory }).toString();

    const response = {
      filesSummary,
      gitStatus,
      gitDiff
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).send(`Error processing project summary: ${error.message}`);
  }
});

function extractSymbols(fileContent) {
  // Implementation...
  return [];
}

function extractSummaryDocumentation(lines) {
  // Implementation...
  return '';
}
