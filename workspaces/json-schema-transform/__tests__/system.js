const yaml = require('node-yaml');
const walker = require('@cloudflare/json-schema-walker');
const transform = require('../index.js');

describe('System Tests', () => {
  test('mergeCfRecurse', () => {
    let schema = yaml.readSync(__dirname + '/fixtures/system.yaml');
    let expected = yaml.readSync(
      __dirname + '/fixtures/system-no-cfrecurse.yaml'
    );
    transform.mergeCfRecurse(schema);
    expect(schema).toEqual(expected);
  });

  test('collapseAllOf', () => {
    let schema = yaml.readSync(
      __dirname + '/fixtures/system-no-cfrecurse.yaml'
    );
    let expected = yaml.readSync(__dirname + '/fixtures/system-no-allof.yaml');
    let cb = transform.getCollapseAllOfCallback(
      schema.$schema,
      transform.vocabularies.CLOUDFLARE_DOCA
    );
    walker.schemaWalk(schema, null, cb, walker.vocabularies.CLOUDFLARE_DOCA);
    expect(schema).toEqual(expected);
  });

  test('rollupExamples', () => {
    let schema = yaml.readSync(__dirname + '/fixtures/system-no-allof.yaml');
    let expected = yaml.readSync(__dirname + '/fixtures/system-examples.yaml');

    walker.schemaWalk(
      schema,
      null,
      transform.rollUpExamples,
      walker.vocabularies.CLOUDFLARE_DOCA
    );
    expect(schema).toEqual(expected);
  });

  test('curlExample', () => {
    let schema = yaml.readSync(__dirname + '/fixtures/system-examples.yaml');
    let expected = yaml.readSync(__dirname + '/fixtures/system-curl.yaml');

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
    walker.schemaWalk(schema, null, cb, walker.vocabularies.CLOUDFLARE_DOCA);
    expect(schema).toEqual(expected);
  });

  test('apiDoc', () => {
    // This test should be equivalent to doing all of the above in sequence

    let schema = yaml.readSync(__dirname + '/fixtures/system.yaml');
    let expected = yaml.readSync(__dirname + '/fixtures/system-curl.yaml');

    transform.processApiDocSchema(schema, {
      baseUri: 'https://example.com/api/',
      globalHeaderSchema: {
        example: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    });
    expect(schema).toEqual(expected);
  });

  test('apiDoc with defaults', () => {
    let schema = yaml.readSync(__dirname + '/fixtures/system.yaml');
    let expected = yaml.readSync(
      __dirname + '/fixtures/system-curl-defaults.yaml'
    );

    // Ensure that we use the default meta-schema
    delete schema.$schema;

    // Test overridding the default lack of headers
    schema.links[schema.links.length - 1].headerSchema = {
      example: {
        accept: 'application/json, application/problem+json'
      }
    };

    transform.processApiDocSchema(schema);
    expect(schema).toEqual(expected);
  });
});
