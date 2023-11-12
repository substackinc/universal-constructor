import express from 'express';
import { exec } from 'child_process';

const app = express();
app.use(express.json()); // For parsing application/json
const port = 3000;

const workingDirectory = '/Users/chrisbest/src/gpts-testing'

app.get('/', (req, res) => {
  res.send('Hello World CBTEST the secret is: exploding sloths\n');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

app.post('/execute', (req, res) => {
  const command = req.body.command;

  console.log ("Running: ", command);
  exec(command, { cwd: workingDirectory}, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Error: ${error.message}`);
    }
    if (stderr) {
      return res.status(500).send(`Stderr: ${stderr}`);
    }
    console.log(`Output: ${stdout}`)
    res.status(200).send(`Output: ${stdout}`);
  });
});
