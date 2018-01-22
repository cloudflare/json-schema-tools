const _ = require('lodash');
const collapser = require('../lib/allOf.js');

describe('"allOf" Collapsing', () => {
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

  describe('#maxOfMin', () => {
    test('Parent max', () => {
      let parent = { x: 42 };
      collapser._maxOfMin(parent, [], { x: -42 }, {}, 'x');
      expect(parent).toEqual({ x: 42 });
    });

    test('Subschema max', () => {
      let parent = { x: 0.23 };
      collapser._maxOfMin(parent, [], { x: 1.99 }, {}, 'x');
      expect(parent).toEqual({ x: 1.99 });
    });
  });

  describe('#minOfMax', () => {
    test('Parent min', () => {
      let parent = { x: -1 };
      collapser._minOfMax(parent, [], { x: 2 }, {}, 'x');
      expect(parent).toEqual({ x: -1 });
    });

    test('Subschema min', () => {
      let parent = { x: 100.23 };
      collapser._minOfMax(parent, [], { x: 1.99 }, {}, 'x');
      expect(parent).toEqual({ x: 1.99 });
    });
  });

  describe('#exclusiveComparison', () => {
    /* Note that this is such a weird case (eliminated in draft-06)
     * that the function is hardcoded for 'minimum' and 'maximum'
     * rather than working with any possible keyword fitting the pattern.
     */
    test('Keep both in parent', () => {
      let parent = {
        minimum: 4,
        exclusiveMinimum: true
      };
      collapser._exclusiveComparison(
        parent,
        [],
        { minimum: 3.999 },
        {},
        'minimum'
      );
      expect(parent).toEqual({ minimum: 4, exclusiveMinimum: true });
    });

    test('Use subschema value, undefine the exclusive modifier', () => {
      let parent = {
        minimum: 4,
        exclusiveMinimum: true
      };
      collapser._exclusiveComparison(
        parent,
        [],
        { minimum: 4.001 },
        {},
        'minimum'
      );
      expect(parent).toEqual({ minimum: 4.001 });
    });

    test('Use subschema value and exclusive modifier', () => {
      let parent = {
        maximum: 100
      };
      collapser._exclusiveComparison(
        parent,
        [],
        { maximum: 0, exclusiveMaximum: true },
        {},
        'maximum'
      );
      expect(parent).toEqual({ maximum: 0, exclusiveMaximum: true });
    });

    test('Same value, but copy exclusive modifier to parent', () => {
      let parent = {
        maximum: 1
      };
      collapser._exclusiveComparison(
        parent,
        [],
        { maximum: 1, exclusiveMaximum: true },
        {},
        'maximum'
      );
      expect(parent).toEqual({ maximum: 1, exclusiveMaximum: true });
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

  describe('#arrayIntersection', () => {
    test('Intersection with overlap', () => {
      let parent = {
        x: [1, 2, 3]
      };
      collapser._arrayIntersection(parent, [], { x: [2, 3, 4] }, {}, 'x');
      expect(parent).toEqual({ x: [2, 3] });
    });

    test('Intersection without overlap', () => {
      let parent = {
        x: [1, 2, 3]
      };
      collapser._arrayIntersection(parent, [], { x: [4, 5, 6] }, {}, 'x');
      expect(parent).toEqual({ x: [] });
    });
  });

  describe('#singleValueOrArrayIntersection', () => {
    test('Arrays to array', () => {
      let parent = {
        x: [1, 2, 3]
      };
      collapser._singleValueOrArrayIntersection(
        parent,
        [],
        { x: [2, 3, 4] },
        {},
        'x'
      );
      expect(parent).toEqual({ x: [2, 3] });
    });

    test('Arrays to single value', () => {
      let parent = {
        x: [1, 2, 3]
      };
      collapser._singleValueOrArrayIntersection(
        parent,
        [],
        { x: [3, 4] },
        {},
        'x'
      );
      expect(parent).toEqual({ x: 3 });
    });

    test('Parent single value', () => {
      let parent = {
        x: 2
      };
      collapser._singleValueOrArrayIntersection(
        parent,
        [],
        { x: [2, 3, 4] },
        {},
        'x'
      );
      expect(parent).toEqual({ x: 2 });
    });

    test('Subschema single value', () => {
      let parent = {
        x: [1, 2, 3]
      };
      collapser._singleValueOrArrayIntersection(parent, [], { x: 1 }, {}, 'x');
      expect(parent).toEqual({ x: 1 });
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

      collapser._collapseObjectOfSchemas(parent, [], subschema, vocab, 'props');

      expect(parent).toEqual(expected);
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
      ).toThrow('Mixed schema and array form of "items" not supported at /');
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
      ).toThrow('Mixed schema and array form of "items" not supported at /');
    });

    test('Collapse multiple arrays, sub-array larger', () => {
      let parent = {
        items: [{ title: 'p1' }, { title: 'p2' }]
      };
      let subschema = {
        items: [
          { description: 's1' },
          { description: 's2' },
          { description: 's3' }
        ]
      };
      let expected = {
        items: [
          { title: 'p1', description: 's1' },
          { title: 'p2', description: 's2' },
          { description: 's3' }
        ]
      };
      collapser._collapseArrayOrSingleSchemas(
        parent,
        [],
        subschema,
        {},
        'items'
      );
      expect(parent).toEqual(expected);
    });

    test('Collapse multiple arrays, sub-array not larger', () => {
      let parent = {
        items: [{ title: 'p1' }]
      };
      let subschema = {
        items: [{ description: 's1' }]
      };
      let expected = {
        items: [{ title: 'p1', description: 's1' }]
      };
      collapser._collapseArrayOrSingleSchemas(
        parent,
        [],
        subschema,
        {},
        'items'
      );
      expect(parent).toEqual(expected);
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
      let parent = { x: { y: 1 }, additionalItems: {} };
      let subschema = { x: { z: 2 }, additionalItems: {} };

      // We don't care what's in the vocabulary as long as we can
      // recognize it in the mock call.  Same for parentPath.
      let vocab = { dontCare: () => {} };

      collapser._collapseArrayOrSingleSchemas(
        parent,
        [],
        subschema,
        vocab,
        'x'
      );
    });
  });

  describe('#collapseSchemas', () => {
    beforeEach(() => {
      this.xSchema = { x: 1 };
      this.ySchema = { y: 1 };
      this.xVocab = { x: jest.fn() };
    });

    test('No-op on boolean true subschema', () => {
      let result = collapser.collapseSchemas(
        this.xSchema,
        [],
        true,
        this.xVocab,
        'x'
      );
      expect(result).toEqual({ x: 1 });
      expect(this.xVocab.x.mock.calls.length).toBe(0);
    });

    test('No-op on boolean false parent schema', () => {
      let result = collapser.collapseSchemas(false, [], true, this.xVocab, 'x');
      expect(result).toBe(false);
      expect(this.xVocab.x.mock.calls.length).toBe(0);
    });

    test('Exception on boolean true parent', () => {
      expect(
        collapser.collapseSchemas.bind(
          collapser,
          true,
          [],
          this.xSchema,
          {},
          'x'
        )
      ).toThrow('Cannot collapse boolean schemas at /');
    });

    test('Exception on boolean false subschema', () => {
      expect(
        collapser.collapseSchemas.bind(
          collapser,
          this.xSchema,
          [],
          false,
          {},
          'x'
        )
      ).toThrow('Cannot collapse boolean schemas at /');
    });

    test('No keyword is in both schemas', () => {
      let expected = Object.assign({}, this.xSchema, this.ySchema);
      let result = collapser.collapseSchemas(
        this.xSchema,
        [],
        this.ySchema,
        this.xVocab,
        'x'
      );
      expect(result).toEqual(expected);
      expect(result).toBe(this.xSchema);
      expect(this.xVocab.x.mock.calls.length).toBe(0);
    });

    test('Vocabulary keyword is in both schemas', () => {
      let subschema = { x: 2 };
      let result = collapser.collapseSchemas(
        this.xSchema,
        [],
        subschema,
        this.xVocab,
        'x'
      );
      expect(result).toBe(this.xSchema);
      expect(this.xVocab.x.mock.calls.length).toBe(1);
      expect(this.xVocab.x.mock.calls[0]).toEqual([
        this.xSchema,
        [],
        subschema,
        this.xVocab,
        'x'
      ]);
    });

    test('Ensure stray exclusiveMaximum is deleted', () => {
      // In this scenario, _exclusiveComparison is not
      // called because maximum is only in the child.
      let parent = { exclusiveMaximum: true };
      let subschema = { maximum: 10 };
      expect(
        collapser.collapseSchemas(parent, [], subschema, collapser.DRAFT_04)
      ).toEqual({ maximum: 10 });
    });

    test('Ensure stray exclusiveMinimum is deleted', () => {
      // In this scenario, _exclusiveComparison is not
      // called because minimum is only in the child.
      let parent = { exclusiveMinimum: true };
      let subschema = { minimum: 10 };
      expect(
        collapser.collapseSchemas(parent, [], subschema, collapser.DRAFT_04)
      ).toEqual({ minimum: 10 });
    });
  });

  describe('Get callback', () => {
    beforeEach(() => {});

    test('No allOf in subschema', () => {
      let subschema = { title: 'Subschema' };
      let parent = { allOf: [subschema] };
      let c = collapser.getCollapseAllOfCallback();

      c(subschema, ['allOf', 0], parent, []);
      expect(subschema).toEqual({ title: 'Subschema' });
    });

    test('allOf in subschema', () => {
      let firstAllOf = { title: 'First in allOf' };
      let subschema = { allOf: [firstAllOf] };
      let parent = { items: subschema };

      let c = collapser.getCollapseAllOfCallback(
        'http://json-schema.org/draft-04/schema#'
      );

      c(subschema, ['items'], parent, []);

      // We should have copied the title up and deleted the allOf.
      expect(subschema).toEqual({
        title: firstAllOf.title
      });
    });

    test('Additional vocabularies, unrecognized vocab term', () => {
      let subschema = {
        vocabTerm: 'outer',
        allOf: [
          { vocabTerm: 'inner', unexpected: false },
          { title: 'Second in allOf', unexpected: true }
        ]
      };
      let parent = { items: subschema };

      // "Child wins" behavior, which is not a callback we otherwise have.
      let extra = {
        vocabTerm: (p, pp, s) => {
          p.vocabTerm = s.vocabTerm;
        }
      };
      let c = collapser.getCollapseAllOfCallback(
        'http://json-schema.org/draft-04/hyper-schema#',
        collapser.CLOUDFLARE_DOCA,
        extra
      );
      c(subschema, ['items'], parent, []);

      // The conflicting "unexpected"s are unrecognized so the later value
      // is ignored.
      // "extra" should keep the outer value as its callback is a no-op.
      expect(subschema).toEqual({
        vocabTerm: 'inner',
        title: 'Second in allOf',
        unexpected: false
      });
    });
  });
});
