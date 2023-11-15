import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { exec, spawn } from 'child_process';

const app = express();
app.use(express.json()); // For parsing application/json
const port = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const workingDirectory = '/Users/chrisbest/src/gpts-testing'

app.get('/', (req, res) => {
  res.send('Hello World CBTEST the secret is: exploding sloths\n');
});

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
