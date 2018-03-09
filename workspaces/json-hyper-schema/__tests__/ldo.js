'use strict';

var ldoLib = require('../lib/ldo');

describe('Extract one or more LDOs from a hyper-schema', () => {
  beforeEach(() => {
    this.schema = {
      links: [
        {
          // Omit method to test defaulting to GET.
          title: 'List the Things',
          rel: 'collection',
          href: 'things'
        },
        {
          title: 'Create a Thing',
          rel: 'collection',
          href: 'things',
          method: 'POST'
        },
        {
          title: 'Fetch a Thing',
          rel: 'self',
          href: 'things/{id}',
          method: 'GET'
        },
        {
          title: 'Delete a Thing',
          rel: 'self',
          href: 'things/{id}',
          method: 'DELETE'
        }
      ]
    };
  });

  test('Extract multiple; extract by rel', () => {
    let ldos = ldoLib.extractLdos({ rel: 'self' }, this.schema);
    expect(ldos[0]).toBe(this.schema.links[2]);
    expect(ldos[1]).toBe(this.schema.links[3]);
    expect(ldos.length).toBe(2);
  });

  test('Extract single; extract by title', () => {
    let ldo = ldoLib.extractLdo({ title: 'list the things' }, this.schema);
    expect(ldo).toBe(this.schema.links[0]);
  });

  test('Multiple values error; extract by method', () => {
    expect(
      ldoLib.extractLdo.bind(null, { method: 'GET' }, this.schema)
    ).toThrow('Found duplicate links for \'{"method":"GET"}\'');
  });

  test('No values empty list; ignore other fields', () => {
    expect(ldoLib.extractLdos({ href: 'things' }, this.schema)).toEqual([]);
  });

  test('No values error', () => {
    expect(
      ldoLib.extractLdo.bind(null, { method: 'PATCH' }, this.schema)
    ).toThrow('No link found for \'{"method":"PATCH"}\'');
  });
});

describe('Resolve URI Templates', () => {
  beforeAll(() => {
    // Note that "zone.id" should never be used, only the nested zone id.
    this.data = {
      id: 1,
      zone: { id: 2 },
      'zone.id': 3
    };
    this.input = {
      zone: { id: 4 }
    };
  });

  test('Nested namespace, mixed styles', () => {
    expect(
      ldoLib.resolveUri(
        { href: 'nonsense/{zone.id}/whatever/{id}' },
        this.data,
        this.input
      )
    ).toEqual('nonsense/4/whatever/1');
  });

  test('No data provided', () => {
    // Unfilled template variables are removed per RFC.
    expect(ldoLib.resolveUri({ href: 'foo{?bar}' })).toEqual('foo');
  });

  test('Insufficient data provided', () => {
    // Unfilled template variables are removed per RFC.
    expect(ldoLib.resolveUri({ href: 'foo{?a.b.c}' }, { d: 1 })).toEqual('foo');
  });

  test('No href provided', () => {
    expect(ldoLib.resolveUri.bind(null, { rel: 'item' }, {})).toThrow(
      'No href to resolve!'
    );
  });
});
