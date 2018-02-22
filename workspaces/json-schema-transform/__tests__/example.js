const _ = require('lodash');
const example = require('../lib/example.js');

describe('example rollup', () => {
  describe('_determineType()', () => {
    test('type is set', () => {
      expect(example._determineType({ type: 'boolean' })).toBe('boolean');
    });

    test('type has multiple values', () => {
      expect(example._determineType({ type: ['string', 'null'] })).toBe(
        'string'
      );
    });

    test('object and *Of with no property keywords', () => {
      expect(example._determineType({ type: 'object', oneOf: [] })).toBe(
        'multi'
      );
    });

    test('implicit object with properties keyword', () => {
      expect(example._determineType({ properties: {} })).toBe('object');
    });

    test('array and *Of with no items keyword', () => {
      expect(example._determineType({ type: 'array', anyOf: [] })).toBe(
        'multi'
      );
    });

    test('implicit array with items keyword', () => {
      expect(example._determineType({ items: {} })).toBe('array');
    });

    test('oneOf without type', () => {
      expect(example._determineType({ oneOf: [] })).toBe('multi');
    });

    test('anyOf without type', () => {
      expect(example._determineType({ anyOf: [] })).toBe('multi');
    });

    test('no type, no *Of, no property or item keywords', () => {
      expect(example._determineType({ minimum: 1 })).toBeUndefined();
    });
  });

  describe('rollUpExamples()', () => {
    beforeAll(() => {
      // "items" is arbitrary, it just needs to be a keyword that
      // takes a subschema as a value, and the same object (or boolean)
      // needs to be used for both the subschema parameter and he subschema
      // in the parent schema.
      this.makeArgs = subschema => {
        let args = [subschema, ['items'], { items: subschema }, []];
        return [args, _.cloneDeep(args)];
      };
    });

    test('boolean true schema', () => {
      let [args, unmodified] = this.makeArgs(true);
      example.rollUpExamples(...args);
      expect(args).toEqual(unmodified);
    });

    test('boolean false schema', () => {
      let [args, unmodified] = this.makeArgs(true);
      example.rollUpExamples(...args);
      expect(args).toEqual(unmodified);
    });

    test('example is present, type otherwise undetectable', () => {
      let [args, unmodified] = this.makeArgs({ example: 42 });
      example.rollUpExamples(...args);
      expect(args).toEqual(unmodified);
    });

    test('multi, use oneOf first', () => {
      let [args, expected] = this.makeArgs({
        oneOf: [{ example: 'hello' }, { example: 'goodbye' }],
        anyOf: [{ example: 'nope' }]
      });
      expected[0].example = 'hello';
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('multi, oneOf and anyOf, first example in anyOf[1]', () => {
      let [args, expected] = this.makeArgs({
        oneOf: [{ type: 'boolean' }, { type: 'integar' }],
        anyOf: [
          { multipleOf: 3 },
          {
            multipleOf: 2,
            example: 4
          }
        ]
      });
      expected[0].example = 4;
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('multi, oneOf only', () => {
      let [args, expected] = this.makeArgs({
        oneOf: [{}, { example: 1 }]
      });
      expected[0].example = 1;
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('multi, anyOf only', () => {
      let [args, expected] = this.makeArgs({
        anyOf: [{ example: 'hello' }, { example: 'world' }]
      });
      expected[0].example = 'hello';
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('object with properties', () => {
      let [args, expected] = this.makeArgs({
        type: 'object',
        properties: {
          foo: { example: 'x' },
          bar: { example: 1 },
          omitted: { cfOmitFromExample: true, example: 54321 }
        }
      });
      expected[0].example = { foo: 'x', bar: 1 };
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('object with patternProperties and additionalProperties', () => {
      let [args, expected] = this.makeArgs({
        type: 'object',
        properties: {
          foo: { example: 0 }
        },
        patternProperties: {
          '^x-': { example: 1 }
        },
        additionalProperties: { example: 2 }
      });

      expected[0].example = { foo: 0 };
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('ojbect without properties', () => {
      let [args, expected] = this.makeArgs({
        type: 'object'
      });
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('object with properties without any examples', () => {
      let [args, expected] = this.makeArgs({
        type: 'object',
        properties: {
          x: { type: 'integer' },
          y: { type: 'string' }
        }
      });
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('object with required property with no example', () => {
      let [args, expected] = this.makeArgs({
        type: 'object',
        required: ['x'],
        properties: {
          x: { type: 'integer' },
          y: { example: 1 }
        }
      });
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with single items', () => {
      let [args, expected] = this.makeArgs({
        type: 'array',
        items: { example: 42 }
      });
      expected[0].example = [42];
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with array-form items without additionalItems', () => {
      // Note that the minItems: 2 is a no-op, present to cover the
      // path where a non-zero minItems has no effect.
      let [args, expected] = this.makeArgs({
        type: 'array',
        items: [
          { example: true },
          { example: { some: 'thing' } },
          { example: 10 }
        ],
        minItems: 2
      });
      expected[0].example = [true, { some: 'thing' }, 10];
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with array-form items with additionalItems', () => {
      let [args, expected] = this.makeArgs({
        type: 'array',
        items: [
          { example: true },
          { example: { some: 'thing' } },
          { example: 10 }
        ],
        additionalItems: {
          example: null
        }
      });
      expected[0].example = [true, { some: 'thing' }, 10, null];
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array without items or *Of', () => {
      // Note that additionalItems is ignored without items,
      // so we still do not see a rolled up example.
      let [args, expected] = this.makeArgs({
        type: 'array',
        additionalItems: {
          example: 42
        }
      });
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with minItems > 0 but no defined examples', () => {
      let [args, expected] = this.makeArgs({ type: 'array', minItems: 3 });
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with minItems > 0 and single schema items', () => {
      let [args, expected] = this.makeArgs({
        type: 'array',
        items: {
          example: 12345
        },
        minItems: 2
      });
      expected[0].example = [12345, 12345];
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with minItems > 0 using additionalItems', () => {
      let [args, expected] = this.makeArgs({
        type: 'array',
        items: [{ example: 'a' }],
        additionalItems: {
          example: 'b'
        },
        minItems: 4
      });
      expected[0].example = ['a', 'b', 'b', 'b'];
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('scalar type with default', () => {
      let [args, expected] = this.makeArgs({
        default: null
      });
      expected[0].example = null;
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });

    test('scalar type without default', () => {
      let [args, expected] = this.makeArgs({
        type: 'number'
      });
      example.rollUpExamples(...args);
      expect(args).toEqual(expected);
    });
  });

  describe('curl examples', () => {
    beforeAll(() => {
      this.base = 'https://example.com/api/';
      this.globalHeaders = {
        required: ['content-type', 'x-auth-email', 'x-auth-key'],
        properties: {
          'x-auth-email': {
            type: 'string',
            description: 'Your Cloudflare email',
            example: 'user@example.com'
          },
          'x-auth-key': {
            type: 'string',
            length: 45,
            description: 'Your Cloudflare API key',
            example: 'c2547eb745079dac9320b638f5e225cf483cc5cfdda41'
          },
          'content-type': {
            type: 'string',
            enum: ['application/json'],
            example: 'application/json',
            description: 'Content type of the API request'
          }
        },
        example: {
          'x-auth-email': 'user@example.com',
          'x-auth-key': 'c2547eb745079dac9320b638f5e225cf483cc5cfdda41',
          'content-type': 'application/json'
        }
      };
      this.globalHeadersExpected =
        ' \\\n     -H "Content-Type: application/json"' +
        ' \\\n     -H "X-Auth-Email: user@example.com"' +
        ' \\\n     -H "X-Auth-Key: ' +
        'c2547eb745079dac9320b638f5e225cf483cc5cfdda41"';
    });

    test('defaulted GET, no query string, no headers', () => {
      let ldo = {
        href: 'foos',
        headerSchema: {}
      };
      let schema = { links: [ldo] };

      let cb = example.getCurlExampleCallback(
        schema,
        this.base,
        this.globalHeaders
      );
      cb(schema, [], null, []);
      expect(ldo.cfCurl).toBe(`curl -X GET "${this.base}foos"`);
    });

    test('explicit GET, query string, global headers', () => {
      let ldo = {
        href: 'foos',
        method: 'GET',
        schema: {
          properties: {
            thing: { example: 'xyz' },
            stuff: { example: 42 }
          },
          example: {
            thing: 'xyz',
            stuff: 42
          }
        }
      };
      let schema = { links: [ldo] };

      let cb = example.getCurlExampleCallback(
        schema,
        this.base,
        this.globalHeaders
      );
      cb(schema, [], null, []);
      expect(ldo.cfCurl).toBe(
        `curl -X GET "${this.base}foos?stuff=42&thing=xyz"${
          this.globalHeadersExpected
        }`
      );
    });
    test('DELETE, no data or query, no global or local headers', () => {
      // Test capitalizing a lowercase method as well.
      let ldo = {
        href: 'deletable/thing',
        method: 'delete'
      };
      let schema = { links: [ldo] };
      let cb = example.getCurlExampleCallback(schema, this.base);
      cb(schema, [], null, []);
      expect(ldo.cfCurl).toBe(`curl -X DELETE "${this.base}deletable/thing"`);
    });

    test('PUT JSON data, template vars, override headers', () => {
      let ldo = {
        href: 'foos/{foo}/bars/{bar}',
        method: 'PUT',
        schema: {
          type: 'object',
          properties: {
            x: { example: 2 },
            y: { example: true }
          },
          example: { x: 2, y: true }
        },
        headerSchema: {
          properties: {
            accept: { example: 'application/json' }
          },
          example: {
            accept: 'application/json'
          }
        }
      };
      let schema = {
        links: [ldo],
        example: {
          foo: 123,
          bar: 456
        }
      };
      let cb = example.getCurlExampleCallback(
        schema,
        this.base,
        this.globalHeaders
      );
      cb(schema, [], null, []);
      expect(ldo.cfCurl).toBe(
        `curl -X PUT "${this.base}foos/123/bars/456"` +
          ` \\\n     -H "Accept: application/json"` +
          ` \\\n     --data '${JSON.stringify(ldo.schema.example)}'`
      );
    });

    test('POST form data', () => {
      let ldo = {
        href: 'postable',
        method: 'POST',
        encType: 'multipart/form-data',
        schema: {
          type: 'object',
          properties: {
            x: { example: 2 },
            y: { example: true }
          },
          example: { x: 2, y: true }
        }
      };
      let schema = { links: [ldo] };
      let cb = example.getCurlExampleCallback(
        schema,
        this.base,
        this.globalHeaders
      );
      cb(schema, [], null, []);
      expect(ldo.cfCurl).toBe(
        `curl -X POST "${this.base}postable"${this.globalHeadersExpected}` +
          ` \\\n     --form 'x=2;y=true'`
      );
    });

    test('No links, no problem', () => {
      let schema = {};
      let cb = example.getCurlExampleCallback(
        schema,
        this.base,
        this.globalHeaders
      );
      expect(cb.bind(example, schema, [], null, [])).not.toThrow();
    });
  });

  test('index export', () => {
    let transform = require('../index.js');
    expect(transform.rollUpExamples).toBe(example.rollUpExamples);
    expect(transform.getCurlExampleCallback).toBe(
      example.getCurlExampleCallback
    );
  });
});
