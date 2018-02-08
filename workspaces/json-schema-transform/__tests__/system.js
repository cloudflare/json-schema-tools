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

  test('apiDoc', () => {
    // This test should be equivalent to doing all of the above in sequence

    // Path is relative to json-schema-transform/package.json
    let schema = yaml.readSync('./__tests__/fixtures/system.yaml');
    let expected = yaml.readSync('./__tests__/fixtures/system-curl.yaml');

    transform.processApiDocSchema(schema, {
      baseUri: 'https://example.com/api/',
      globalRequestHeaders: {
        example: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    });
    expect(schema).toEqual(expected);
  });

  test('apiDoc with defaults', () => {
    // Path is relative to json-schema-transform/package.json
    let schema = yaml.readSync('./__tests__/fixtures/system.yaml');
    let expected = yaml.readSync(
      './__tests__/fixtures/system-curl-defaults.yaml'
    );

    // Ensure that we use the default meta-schema
    delete schema.$schema;

    // Test overridding the default lack of headers
    schema.links[schema.links.length - 1].cfRequestHeaders = {
      example: {
        Accept: 'application/json, application/problem+json'
      }
    };

    transform.processApiDocSchema(schema);
    expect(schema).toEqual(expected);
  });
});
