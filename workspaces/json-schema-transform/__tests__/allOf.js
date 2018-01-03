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
});
