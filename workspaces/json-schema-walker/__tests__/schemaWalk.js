'use strict';

var schemaWalk = require('../lib/schemaWalk');

describe('Walk schema', () => {
  for (let testSchemaParam of [{}, true]) {
    test(
      `Callbacks on root ${typeof testSchema} schema`,
      (testSchema => {
        let positions = { pre: false, post: false };

        let checkRoot = (position, subschema, path, parent, parentPath) => {
          positions[position] = true;
          expect(subschema).toEqual(testSchema);
          expect(path).toEqual([]);
          expect(parent).toEqual(undefined);
          expect(parentPath).toEqual([]);
        };

        schemaWalk.schemaWalk(
          testSchema,
          checkRoot.bind(this, 'pre'),
          checkRoot.bind(this, 'post')
        );
        expect(positions.pre).toBe(true);
        expect(positions.post).toBe(true);
      }).bind(null, testSchemaParam)
    );
  }

  test('Callbacks on subschemas', () => {
    let testSchema = { items: {} };
    let positions = { pre: false, post: false };

    let checkSubschema = (position, subschema, path, parent, parentPath) => {
      if (parent !== undefined) {
        positions[position] = true;
        expect(subschema).toEqual(testSchema.items);
        expect(path).toEqual(['items']);
        expect(parent).toEqual(testSchema);
      }
      // Because we are only walking one level, both the initial parentPath
      // (representing the non-existent parent of the root schema) and the
      // parentPath for the subschema (representing the actual root schema)
      // are empty.
      expect(parentPath).toEqual([]);
    };

    schemaWalk.schemaWalk(
      testSchema,
      checkSubschema.bind(this, 'pre'),
      checkSubschema.bind(this, 'post')
    );
    expect(positions.pre).toBe(true);
    expect(positions.post).toBe(true);
  });
});

describe('Walk subschemas', () => {
  test('Test all subschema keywords', () => {
    let expectedSubschemas = new Set();
    for (let i = 0; i < 18; i++) {
      expectedSubschemas.add({
        title: 'Subschema #' + i,
        sortcode: i
      });
    }

    let iter = expectedSubschemas.values();
    let testSchemaSingleLevelSingleItems = {
      properties: {
        one: iter.next().value,
        two: iter.next().value
      },
      patternProperties: {
        one: iter.next().value,
        two: iter.next().value
      },
      additionalProperties: iter.next().value,
      extraProperties: {
        one: iter.next().value,
        two: iter.next().value
      },
      dependencies: {
        one: iter.next().value,
        two: iter.next().value,
        three: 'this is a string'
      },
      items: iter.next().value,
      additionalItems: iter.next().value,
      not: iter.next().value,
      allOf: [iter.next().value, iter.next().value],
      anyOf: [iter.next().value, iter.next().value],
      oneOf: [iter.next().value, iter.next().value]
    };

    let actual = [];
    schemaWalk.subschemaWalk(
      testSchemaSingleLevelSingleItems,
      (schema, path, parent) => {
        actual.push(schema);
      }
    );

    // We test the order in other cases.
    // Sadly even if both are Sets, jest compares by
    // iteration order which is not consistent.
    // We just us the Set for the iterator.next() function.
    let expected = Array.from(expectedSubschemas);
    let cmp = (a, b) => {
      return a.sortcode - b.sortcode;
    };
    expected.sort(cmp);
    actual.sort(cmp);

    expect(actual).toEqual(expected);
  });

  describe('Test array items and recursion', () => {
    beforeAll(() => {
      this.testSchema = {
        items: [
          { title: 'outer' },
          { properties: { foo: { title: 'inner' } } }
        ],
        additionalItems: false
      };
    });

    test('preorder', () => {
      let actual = [];
      schemaWalk.subschemaWalk(
        this.testSchema,
        (schema, path, parent, parentPath) => {
          actual.push([schema, path, parentPath]);
        }
      );

      expect(actual).toEqual([
        [this.testSchema.items[0], ['items', 0], []],
        [this.testSchema.items[1], ['items', 1], []],
        [
          this.testSchema.items[1].properties.foo,
          ['properties', 'foo'],
          ['items', 1]
        ],
        [this.testSchema.additionalItems, ['additionalItems'], []]
      ]);
    });

    test('postorder', () => {
      let actual = [];
      schemaWalk.subschemaWalk(
        this.testSchema,
        null,
        (schema, path, parent, parentPath) => {
          actual.push([schema, path, parentPath]);
        }
      );

      expect(actual).toEqual([
        [this.testSchema.items[0], ['items', 0], []],
        [
          this.testSchema.items[1].properties.foo,
          ['properties', 'foo'],
          ['items', 1]
        ],
        [this.testSchema.items[1], ['items', 1], []],
        [this.testSchema.additionalItems, ['additionalItems'], []]
      ]);
    });
  });

  test('Link schemas', () => {
    let testSchema = {
      links: [
        {
          schema: { title: 'schema schema' }
        },
        {
          targetSchema: {
            title: 'targetSchema schema',
            patternProperties: {
              '^foo': {
                title: 'patternProperties schema'
              }
            }
          }
        }
      ]
    };
    let actual = [];

    schemaWalk.subschemaWalk(
      testSchema,
      null,
      (schema, path, parent, parentPath) => {
        actual.push([schema, path, parentPath]);
      }
    );

    expect(actual).toEqual([
      [testSchema.links[0].schema, ['links', 0, 'schema'], []],
      [
        testSchema.links[1].targetSchema.patternProperties['^foo'],
        ['patternProperties', '^foo'],
        ['links', 1, 'targetSchema']
      ],
      [testSchema.links[1].targetSchema, ['links', 1, 'targetSchema'], []]
    ]);
  });

  test("Don't call post func when schema keyword is removed", () => {
    let testSchema = {
      properties: { a: {} },
      extraProperties: { b: {} },
      patternProperties: { c: {} },
      dependencies: { d: 'string', e: {} },
      additionalProperties: {},
      items: {},
      additionalItems: {},
      not: {},
      allOf: [{}],
      anyOf: [{}],
      oneOf: [{}],
      links: [{ schema: {} }]
    };
    schemaWalk.subschemaWalk(
      testSchema,
      (schema, path, parent) => {
        delete parent[path[0]];
      },
      (schema, path, parent) => {
        expect(true).toEqual(false);
      }
    );

    expect(testSchema).toEqual({});

    // Can't test "items" as both array and single schema at the same time.
    schemaWalk.subschemaWalk(
      { items: [{}] },
      (schema, path, parent) => {
        delete parent[path[0]];
      },
      (schema, path, parent) => {
        expect(true).toEqual(false);
      }
    );
  });

  test("Don't call post func when LDO keyword is removed", () => {
    let testSchema = {
      links: [
        {
          schema: {},
          targetSchema: {}
        }
      ]
    };
    schemaWalk.subschemaWalk(
      testSchema,
      (schema, path, parent) => {
        delete parent[path[0]][path[1]][path[2]];
      },
      (schema, path, parent) => {
        expect(true).toEqual(false);
      }
    );
    expect(testSchema.links).toEqual([{}]);
  });

  test("Re-throw of non-'next keyword' exception", () => {
    expect(
      schemaWalk.subschemaWalk.bind(this, { items: {} }, () => {
        throw 'lulz';
      })
    ).toThrow('lulz');
  });

  test('Array in place of schema', () => {
    expect(schemaWalk.subschemaWalk.bind(this, ['array'], () => {})).toThrow(
      'Expected object or boolean as schema, got array'
    );
  });

  test('String in place of schema', () => {
    expect(schemaWalk.subschemaWalk.bind(this, 'string', () => {})).toThrow(
      'Expected object or boolean as schema, got string'
    );
  });
});
