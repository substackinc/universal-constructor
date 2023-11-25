// src/tools2/index.js
import execShell from './execShell.js';
import writeFile from './writeFile.js';
import showFile from './showFile.js';
import getSummary from './getSummary.js';
import searchFile from './searchFile.js';
import replaceInFile from './replaceInFile.js';
import restartInterface from './restartInterface.js';

export const toolsDict = {
    execShell,
    writeFile,
    showFile,
    getSummary,
    searchFile,
    replaceInFile,
    restartInterface,
};

export const tools = [
    { execShell: execShell.spec },
    { writeFile: writeFile.spec },
    { showFile: showFile.spec },
    { getSummary: getSummary.spec },
    { searchFile: searchFile.spec },
    { replaceInFile: replaceInFile.spec },
    { restartInterface: restartInterface.spec },
];
