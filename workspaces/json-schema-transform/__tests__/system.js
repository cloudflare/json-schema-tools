const yaml = require('node-yaml');
const walker = require('@cloudflare/json-schema-walker');
const transform = require('../index.js');

describe('System Tests', () => {
  beforeEach(() => {});

  test('mergeCfRecurse', () => {
    // Path is relative to json-schema-transform/package.json
    let schema = yaml.readSync('./__tests__/fixtures/system.yaml');
    let expected = yaml.readSync(
      './__tests__/fixtures/system-no-cfrecurse.yaml'
    );
    transform.mergeCfRecurse(schema);
    expect(schema).toEqual(expected);
  });

  test('collapseAllOf', () => {
    // Path is relative to json-schema-transform/package.json
    let schema = yaml.readSync('./__tests__/fixtures/system-no-cfrecurse.yaml');
    let expected = yaml.readSync('./__tests__/fixtures/system-no-allof.yaml');
    let cb = transform.getCollapseAllOfCallback(
      schema.$schema,
      transform.CLOUDFLARE_DOCA
    );
    walker.schemaWalk(schema, null, cb);
    expect(schema).toEqual(expected);
  });

  test('rollupExamples', () => {
    // Path is relative to json-schema-transform/package.json
    let schema = yaml.readSync('./__tests__/fixtures/system-no-allof.yaml');
    let expected = yaml.readSync('./__tests__/fixtures/system-examples.yaml');

    walker.schemaWalk(schema, null, transform.rollUpExamples);
    expect(schema).toEqual(expected);
  });

  test('curlExample', () => {
    // Path is relative to json-schema-transform/package.json
    let schema = yaml.readSync('./__tests__/fixtures/system-examples.yaml');
    let expected = yaml.readSync('./__tests__/fixtures/system-curl.yaml');

    let cb = transform.getCurlExampleCallback(
      schema,
      'https://example.com/api/',
      {
        example: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    walker.schemaWalk(schema, null, cb);
    expect(schema).toEqual(expected);
  });
});
