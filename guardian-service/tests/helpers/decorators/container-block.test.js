require('module-alias/register');
const { assert } = require('chai');
const { ContainerBlock } = require('../../../dist/policy-engine/helpers/decorators');

describe('Container Block', function () {
    it('Create', async function () {
        const fn = ContainerBlock({ blockType: 'testBlock', children: [] });
        const result = new fn(function () {});
        assert(result.blockType, 'testBlock');
        assert.isUndefined(result.children);
        assert.isUndefined(result.parent);
        assert.isUndefined(result.uuid);
        assert.isUndefined(result.options);
    });
});
