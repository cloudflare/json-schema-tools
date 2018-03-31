'use strict';

var _ = require('lodash');
var mergeCfRecurse = require('../lib/mergeCfRecurse');
var walker = require('@cloudflare/json-schema-walker');

describe('Merge root schema into "cfRecurse": "" schemas', () => {
  beforeEach(() => {
    this.rootSchema = {
      id: '#root',
      required: ['foo'],
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' }
      }
    };

    this.requestSchema = {
      schema: {
        id: '#empty'
      }
    };

    this.responseSchema = {
      href: 'foo',
      targetSchema: {
        id: '#foo',
        properties: {
          result: {}
        }
      }
    };
  });

  describe('_doMerge', () => {
    test('plain copy', () => {
      let schema = _.cloneDeep(this.requestSchema);
      schema.schema = { cfRecurse: '' };
      mergeCfRecurse._doMerge(schema, 'schema', this.rootSchema);
      expect(schema).toEqual({ schema: this.rootSchema });
    });

    test('override required', () => {
      let expectedSchema = _.cloneDeep(this.rootSchema);
      expectedSchema.required = ['bar'];

      let schema = _.cloneDeep(this.requestSchema);
      schema.schema = {
        required: ['bar'],
        cfRecurse: ''
      };

      mergeCfRecurse._doMerge(schema, 'schema', this.rootSchema);
      expect(schema).toEqual({ schema: expectedSchema });
    });

    test('add type', () => {
      let expectedSchema = _.cloneDeep(this.rootSchema);
      expectedSchema.type = 'object';

      let schema = _.cloneDeep(this.requestSchema);
      schema.schema = {
        type: 'object',
        cfRecurse: ''
      };

      mergeCfRecurse._doMerge(schema, 'schema', this.rootSchema);
      expect(schema).toEqual({ schema: expectedSchema });
    });
  });

  describe('pruneDefinitions', () => {
    test('no template varibles, remove definitions', () => {
      let testSchema = {
        links: [{ href: 'whatever' }],
        definitions: { foo: { type: 'null' } }
      };
      let expected = _.cloneDeep(testSchema);
      delete expected.definitions;

      mergeCfRecurse.pruneDefinitions(testSchema);
      expect(testSchema).toEqual(expected);
    });

    test('does not prune href definitions', () => {
      let testSchema = {
        links: [{ href: 'with/variable/{#/definitions/id}' }],
        definitions: {
          id: { type: 'string' },
          foo: { type: 'null' }
        }
      };
      let expected = _.cloneDeep(testSchema);
      delete expected.definitions.foo;

      mergeCfRecurse.pruneDefinitions(testSchema);
      expect(testSchema).toEqual(expected);
    });

    test('throw on reference deeper than one definition', () => {
      let testSchema = { links: [{ href: '{#/definitions/foo/items}' }] };
      expect(
        mergeCfRecurse.pruneDefinitions.bind(mergeCfRecurse, testSchema)
      ).toThrow(
        "Unsupported template variable format '{#/definitions/foo/items}'"
      );
    });
  });

  describe('removeLinksAndDefs', () => {
    test('remove links and definitions', () => {
      let testSchema = {
        allOf: [{}],
        links: [{ href: 'foo' }],
        definitions: {
          foo: { type: 'integer' }
        }
      };
      let expected = { allOf: [{}] };

      mergeCfRecurse.removeLinksAndDefs(testSchema);
      expect(testSchema).toEqual(expected);
    });

    test('do not error when there are no links or definitions', () => {
      let testSchema = { items: {} };
      mergeCfRecurse.removeLinksAndDefs(testSchema);
      expect(testSchema).toEqual(testSchema);
    });
  });

  describe('mergeCfRecurse', () => {
    beforeEach(() => {
      this.mocked = require('../lib/mergeCfRecurse');
      this.mocked._doMerge = jest.fn();
      this.mocked.pruneDefinitions = jest.fn();
    });

    test('callback makes correct calls, immediate child rel-self', () => {
      let schemaDocument = _.cloneDeep(this.rootSchema);
      schemaDocument.links = [_.cloneDeep(this.requestSchema)];
      schemaDocument.links[0].schema = { items: { cfRecurse: '' } };
      this.mocked.mergeCfRecurse(schemaDocument);

      expect(this.mocked.pruneDefinitions.mock.calls.length).toBe(0);
      expect(this.mocked._doMerge.mock.calls[0]).toEqual([
        schemaDocument.links[0].schema,
        'items',
        this.rootSchema
      ]);
    });

    test('callback makes correct calls, property grandchild rel-self', () => {
      let schemaDocument = _.cloneDeep(this.rootSchema);
      schemaDocument.links = [_.cloneDeep(this.responseSchema)];
      schemaDocument.links[0].targetSchema.properties.result = {
        cfRecurse: ''
      };

      let baseUrl = 'https://api.cloudflare.com/';
      let options = {
        curl: { baseUrl: baseUrl }
      };
      let expected = _.cloneDeep(schemaDocument);
      expected.links[0].href = baseUrl + expected.links[0].href;

      this.mocked.mergeCfRecurse(schemaDocument, options);

      expect(this.mocked.pruneDefinitions.mock.calls.length).toBe(0);
      expect(this.mocked._doMerge.mock.calls[0]).toEqual([
        schemaDocument.links[0].targetSchema.properties,
        'result',
        this.rootSchema
      ]);

      // The href adjustment is directly in the callback and not mocked.
      expect(schemaDocument).toEqual(expected);
    });

    test('calls pruneDefinitions and does not call _doMerge', () => {
      let schemaDocument = {
        links: [{ href: 'foo', targetSchema: {} }],
        definitions: { foo: {} }
      };
      this.mocked.mergeCfRecurse(schemaDocument);
      expect(this.mocked.pruneDefinitions.mock.calls).toEqual([
        [schemaDocument]
      ]);
      expect(this.mocked._doMerge.mock.calls.length).toBe(0);
    });

    test('merge only within links', () => {
      let schemaDocument = { properties: { cfRecurse: '' } };
      let expected = _.cloneDeep(schemaDocument);
      mergeCfRecurse.mergeCfRecurse(schemaDocument);
      expect(schemaDocument).toEqual(expected);
    });

    test('merge only within vocabulary subschemas', () => {
      let schemaDocument = { links: [{ headerSchema: { cfRecurse: '' } }] };
      let expected = _.cloneDeep(schemaDocument);
      mergeCfRecurse.mergeCfRecurse(
        schemaDocument,
        {},
        walker.vocabularies.DRAFT_04_HYPER
      );
      expect(schemaDocument).toEqual(expected);
    });

    test('auto-id for LDO schemas', () => {
      let schemaDocument = {
        id: 'tag:cloudflare.com,2017:id-test',
        links: [
          {
            schema: {}
          },
          {
            schema: { id: '#foo' },
            targetSchema: {}
          }
        ]
      };
      let expected = _.cloneDeep(schemaDocument);
      expected.links[0].schema.id = `${expected.id}#/links/0/schema`;
      expected.links[1].targetSchema.id = `${
        expected.id
      }#/links/1/targetSchema`;
      mergeCfRecurse.mergeCfRecurse(schemaDocument);
      expect(schemaDocument).toEqual(expected);
    });
  });
});
