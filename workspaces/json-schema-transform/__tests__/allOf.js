'use strict';

const _ = require('lodash');
const collapser = require.requireActual('../lib/allOf.js');

describe('"allOf" Collapsing', () => {
  beforeEach(() => {
    this.mocked = require.requireMock('../lib/allOf.js');
    Object.assign(this.mocked, collapser);
    this.mocked.collapseSchemas = jest.fn();
  });

  describe('#undconditional-functions', () => {
    test('test the no-op behavior of _parentWins()', () => {
      let parent = { foo: 1 };
      let subschema = { foo: 2 };
      collapser._parentWins(parent, [], subschema, {}, 'foo');
      expect(parent.foo).toBe(1);
    });

    test('verify notSupported exception', () => {
      // This call doesn't even look at the schemas.
      expect(
        collapser._notSupported.bind(collapser, {}, [], {}, {}, 'foo')
      ).toThrow('Keyword "foo" not supported at /');
    });
  });

  describe('#collision', () => {
    test('no-op if values are equal', () => {
      let parent = { foo: 'bar' };
      collapser._collision(parent, [], { foo: 'bar' }, {}, 'foo');
    });

    test('verify exception on non-equal values', () => {
      expect(
        collapser._collision.bind(
          collapser,
          { foo: 'bar' },
          [],
          { foo: 42 },
          {},
          'foo'
        )
      ).toThrow('Collision for keyword "foo" at /');
    });
  });

  describe('#or', () => {
    test('true || true', () => {
      let parent = { x: true };
      collapser._or(parent, [], { x: true }, {}, 'x');
      expect(parent).toEqual({ x: true });
    });

    test('true || false', () => {
      let parent = { x: true };
      collapser._or(parent, [], { x: false }, {}, 'x');
      expect(parent).toEqual({ x: true });
    });

    test('false || true', () => {
      let parent = { x: false };
      collapser._or(parent, [], { x: true }, {}, 'x');
      expect(parent).toEqual({ x: true });
    });

    test('false || false', () => {
      let parent = { x: false };
      collapser._or(parent, [], { x: false }, {}, 'x');
      expect(parent).toEqual({ x: false });
    });
  });

  describe('#arrayUnion', () => {
    test('Union with overlap', () => {
      let parent = {
        x: [1, 2, 3]
      };
      collapser._arrayUnion(parent, [], { x: [4, 5, 1] }, {}, 'x');
      expect(parent).toEqual({ x: [1, 2, 3, 4, 5] });
    });
  });

  describe('#collapseObjectOfSchemas', () => {
    test('Successful collapse', () => {
      // Uses a fake keyword to also test that "additionalProperties" is
      // ignored unless the keyword is "properties" or "patternProperties".
      let parent = {
        props: {
          parentOnly: { title: 'parentOnly' },
          both: { title: 'both-parent' }
        },
        additionalProperties: false
      };
      let subschema = {
        props: {
          both: { title: 'both-sub' },
          subOnly: { title: 'subOnly' }
        },
        additionalProperties: false
      };

      // We don't expect a change in the "both" property because
      // we mock the call that would change it.
      let expected = Object.assign({}, parent, { subOnly: subschema.subOnly });
      // We don't care what's in the vocabulary as long as we can
      // recognize it in the mock call.  Same for parentPath.
      let vocab = { dontCare: () => {} };

      this.mocked._collapseObjectOfSchemas(
        parent,
        [],
        subschema,
        vocab,
        'props'
      );

      expect(parent).toEqual(expected);
      expect(this.mocked.collapseSchemas.mock.calls.length).toBe(1);
      expect(this.mocked.collapseSchemas.mock.calls[0]).toEqual([
        parent.props.both,
        ['props', 'both'],
        subschema.props.both,
        vocab
      ]);
    });

    test('Exception with additionalProperties: properties in parent', () => {
      expect(
        collapser._collapseObjectOfSchemas.bind(
          collapser,
          { properties: {}, additionalProperties: {} },
          [],
          { properties: {} },
          {},
          'properties'
        )
      ).toThrow('"additionalProperties" not supported at /');
    });

    test('Exception with additionalProperties: patternProperties in subschema', () => {
      expect(
        collapser._collapseObjectOfSchemas.bind(
          collapser,
          { patternProperties: {} },
          [],
          { patternProperties: {}, additionalProperties: {} },
          {},
          'patternProperties'
        )
      ).toThrow('"additionalProperties" not supported at /');
    });
  });

  describe('#collapseArrayOrSingleSchema', () => {
    test('Exception on parent array', () => {
      expect(
        collapser._collapseArrayOrSingleSchemas.bind(
          collapser,
          { items: [{}, {}] },
          [],
          { items: {} },
          {},
          'items'
        )
      ).toThrow('Array form of "items" not supported at /');
    });

    test('Exception on subschema array', () => {
      expect(
        collapser._collapseArrayOrSingleSchemas.bind(
          collapser,
          { items: {} },
          [],
          { items: [{}, {}] },
          {},
          'items'
        )
      ).toThrow('Array form of "items" not supported at /');
    });

    test('Exception on both as arrays', () => {
      expect(
        collapser._collapseArrayOrSingleSchemas.bind(
          collapser,
          { items: [{}, {}] },
          [],
          { items: [{}, {}] },
          {},
          'items'
        )
      ).toThrow('Array form of "items" not supported at /');
    });

    test('Exception with additionalItems in parent', () => {
      expect(
        collapser._collapseArrayOrSingleSchemas.bind(
          collapser,
          { items: {}, additionalItems: {} },
          [],
          { items: {} },
          {},
          'items'
        )
      ).toThrow('"additionalItems" not supported at /');
    });

    test('Exception with additionalItems in subschema', () => {
      expect(
        collapser._collapseArrayOrSingleSchemas.bind(
          collapser,
          { items: {} },
          [],
          { items: {}, additionalItems: {} },
          {},
          'items'
        )
      ).toThrow('"additionalItems" not supported at /');
    });

    test('"additionalItems" ignored without "items"', () => {
      this.mocked.collapseSchemas = jest.fn();

      let parent = { x: { y: 1 }, additionalItems: {} };
      let subschema = { x: { z: 2 }, additionalItems: {} };

      // We don't care what's in the vocabulary as long as we can
      // recognize it in the mock call.  Same for parentPath.
      let vocab = { dontCare: () => {} };

      this.mocked._collapseArrayOrSingleSchemas(
        parent,
        [],
        subschema,
        vocab,
        'x'
      );

      // Because the call is mocked, there is no change to the parent
      // to verify.
      expect(this.mocked.collapseSchemas.mock.calls.length).toBe(1);
      expect(this.mocked.collapseSchemas.mock.calls[0]).toEqual([
        parent.x,
        ['x'],
        subschema.x,
        vocab
      ]);
    });
  });
});
