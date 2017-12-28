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
    // Note that "zone.id" should never be used, only the first five.
    this.data = {
      id: 1,
      identifier: 2,
      zone_id: 3,
      zone_identifier: 4,
      zone: { id: 5 },
      'zone.id': 6,
      nonIdVariable: 7
    };
  });

  test('Flat namespace, JSON Pointers, identifier truncation', () => {
    expect(
      ldoLib.resolveUri(
        {
          href:
            'zones/{#/definitions/zone_identifier}/pagerules/{#/definitions/identifier}'
        },
        this.data
      )
    ).toEqual('zones/3/pagerules/1');
  });

  test('RFC-compliant variables, no identifier truncation', () => {
    expect(
      ldoLib.resolveUri(
        { href: 'zones/{zone_identifier}/pagerules/{identifier}' },
        this.data
      )
    ).toEqual('zones/4/pagerules/2');
  });

  test('Nested namespace, identifier truncation, mixed styles', () => {
    expect(
      ldoLib.resolveUri(
        { href: 'nonsense/{#/definitions/zone.id}/whatever/{zone.id}' },
        this.data
      )
    ).toEqual('nonsense/5/whatever/5');
  });

  test('Variable that is not modified', () => {
    expect(ldoLib.resolveUri({ href: '{nonIdVariable}' }, this.data)).toEqual(
      '7'
    );
  });

  test('No data provided', () => {
    // Unfilled template variables are removed per RFC.
    expect(ldoLib.resolveUri({ href: 'foo{?bar}' })).toEqual('foo');
  });

  test('No href provided', () => {
    expect(ldoLib.resolveUri.bind(null, { rel: 'item' }, {})).toThrow(
      'No href to resolve!'
    );
  });
});
