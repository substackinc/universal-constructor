import test from 'ava';
import importAllTools from '../../src/tools2/index.js';
import Ajv from 'ajv';

const ajv = new Ajv();

function getValidator(t, spec) {
    return ajv.compile(spec.parameters);
}

test(`importAllTools finds execShell`, async (t) => {
    const { toolsByName } = await importAllTools();
    t.truthy(toolsByName.execShell, 'The toolsDict should have execShell');
});

test('execShell spec looks good', async (t) => {
    const { toolsByName } = await importAllTools();
    const { execShell } = toolsByName;
    const { spec } = execShell;

    t.is(spec.name, 'execShell', 'Name is execShell');
    t.is(typeof spec.description, 'string', 'description is a string');
    t.is(typeof spec.parameters, 'object', 'parameters is an object');

    let v;
    t.notThrows(() => (v = ajv.compile(spec.parameters)), 'JSON Schema for parameters compiles');
    const valid = v({
        command: 'ls',
    });
    if (!valid) {
        console.log(v.errors);
    }
    t.true(valid, 'can validate a basic input');
});

test('all specs look basically good', async (t) => {
    const { toolsByName, toolSpecs } = await importAllTools();
    for (let spec of toolSpecs) {
        let tool = toolsByName[spec.name];
        t.truthy(tool, 'tool found for ' + spec.name);
        t.is(typeof spec.description, 'string');
        t.is(typeof spec.parameters, 'object');

        let v;
        t.notThrows(() => (v = ajv.compile(spec.parameters)), `${tool.name} JSON Schema for parameters compiles`);
    }
});
