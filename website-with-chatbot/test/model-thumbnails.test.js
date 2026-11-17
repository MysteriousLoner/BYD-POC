const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { normalize } = require('../server/vehicle-content');
const thumbnails = require('../server/data/model-thumbnails.json');
const models = require('../server/data/models.json');
test('official menu downloads are intact and stay separate from colour galleries', () => {
  assert.equal(Object.keys(thumbnails).length,7);
  for (const model of models) {
    const source=thumbnails[model.id],file=path.join(__dirname,'..',source.image),before=JSON.stringify(model),normalized=normalize(model);
    assert.equal(new URL(source.source).hostname,'byd.simemotors.my');
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),source.sha256);
    assert.equal(normalized.thumbnail,source.image);
    assert.deepEqual(normalized.colours,model.colours);
    assert.deepEqual(normalized.images,model.images);
    assert.equal(JSON.stringify(model),before);
  }
  assert.equal(normalize({id:'seal',name:'Legacy record',images:[]}).thumbnail,undefined);
});
