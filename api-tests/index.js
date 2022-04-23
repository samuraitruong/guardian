const { spawn } = require('child_process');
const kill = require('tree-kill');
const path = require('path');
const fs = require('fs');

const { sleep, GenerateTokens } = require('./helpers');

const { Accounts } = require('./test-suits/accounts');
const { Profiles } = require('./test-suits/profiles');
const { Schemas } = require('./test-suits/schemas');
const { Tokens } = require('./test-suits/tokens');
const { Trustchains } = require('./test-suits/trustchains');
const { Policies } = require('./test-suits/policies');
const { Ipfs } = require('./test-suits/ipfs');

const processes = [];

describe('Api tests', async function () {
    beforeEach(GenerateTokens);

    Accounts();
    Profiles();
    Schemas();
    Tokens();
    Trustchains();
    Policies();
});
