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

  describe('rollupExamples()', () => {
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
      example.rollupExamples(...args);
      expect(args).toEqual(unmodified);
    });

    test('boolean false schema', () => {
      let [args, unmodified] = this.makeArgs(true);
      example.rollupExamples(...args);
      expect(args).toEqual(unmodified);
    });

    test('example is present, type otherwise undetectable', () => {
      let [args, unmodified] = this.makeArgs({ example: 42 });
      example.rollupExamples(...args);
      expect(args).toEqual(unmodified);
    });

    test('multi, use oneOf first', () => {
      let [args, expected] = this.makeArgs({
        oneOf: [{ example: 'hello' }, { example: 'goodbye' }],
        anyOf: [{ example: 'nope' }]
      });
      expected[0].example = 'hello';
      example.rollupExamples(...args);
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
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('multi, oneOf only', () => {
      let [args, expected] = this.makeArgs({
        oneOf: [{}, { example: 1 }]
      });
      expected[0].example = 1;
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('multi, anyOf only', () => {
      let [args, expected] = this.makeArgs({
        anyOf: [{ example: 'hello' }, { example: 'world' }]
      });
      expected[0].example = 'hello';
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('object with properties', () => {
      let [args, expected] = this.makeArgs({
        type: 'object',
        properties: {
          foo: { example: 'x' },
          bar: { example: 1 },
          private: { cfPrivate: true, example: true },
          omitted: { cfOmitFromExample: true, example: 54321 }
        }
      });
      expected[0].example = { foo: 'x', bar: 1 };
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('object with patternProperties and additionalProperties', () => {
      // Note that currently, these keywords do not affect the example,
      // but an empty example object is constructed.
      let [args, expected] = this.makeArgs({
        type: 'object',
        patternProperties: {
          '^x-': { example: 1 }
        },
        additionalProperties: { example: 2 }
      });
      expected[0].example = {};
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with single items', () => {
      let [args, expected] = this.makeArgs({
        type: 'array',
        items: { example: 42 }
      });
      expected[0].example = [42];
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with items arrays without additionalItems', () => {
      let [args, expected] = this.makeArgs({
        type: 'array',
        items: [
          { example: true },
          { example: { some: 'thing' } },
          {},
          { example: 10 }
        ]
      });
      expected[0].example = [true, { some: 'thing' }, undefined, 10];
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array with items arrays and additionalItems', () => {
      let [args, expected] = this.makeArgs({
        type: 'array',
        items: [
          { example: true },
          { example: { some: 'thing' } },
          {},
          { example: 10 }
        ],
        additionalItems: {
          example: null
        }
      });
      expected[0].example = [true, { some: 'thing' }, undefined, 10, null];
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('array without items or *Of', () => {
      // Note that additionalItems is ignored without items, so we only
      // see the empty example array in the results.
      let [args, expected] = this.makeArgs({
        type: 'array',
        additionalItems: {
          example: 42
        }
      });
      expected[0].example = [];
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });

    test('scalar type with default', () => {
      let [args, expected] = this.makeArgs({
        default: null
      });
      expected[0].example = null;
      example.rollupExamples(...args);
      expect(args).toEqual(expected);
    });
  });

  test('index export', () => {
    let transform = require('../index.js');
    expect(transform.rollUpExamples).toBe(example.rollUpExamples);
  });
});
