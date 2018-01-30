'use strict';

const uriTemplates = require('uri-templates');

/**
 * Returns the list of LDOs from the top level of the given
 * schema that match the supplied search fields.
 *
 * Only the "title", "rel", and "method" fields are currently
 * supported.  All others are ignored.
 */
function extractLdos(fields, schema) {
  // Ignore unsupported keywords
  let searchable = {};
  fields.title && (searchable.title = fields.title);
  fields.rel && (searchable.rel = fields.rel);
  fields.method && (searchable.method = fields.method);

  let testLinks = schema.links.filter(ldo => {
    let keywords = Object.getOwnPropertyNames(searchable);
    if (!keywords.length) {
      return false;
    }

    let match = true;
    for (let keyword of keywords) {
      let value = ldo[keyword];
      if (value === undefined && keyword === 'method') {
        value = 'GET';
      }
      if (
        value === undefined ||
        value.toLowerCase() !== searchable[keyword].toLowerCase()
      ) {
        match = false;
        break;
      }
    }
    return match;
  });
  return testLinks;
}

/**
 * Same as extractLdos except that it returns a single
 * ldo, and throws on multiple matches or no match.
 */
function extractLdo(fields, schema) {
  let testLinks = extractLdos(fields, schema);
  if (!testLinks.length) {
    throw `No link found for '${JSON.stringify(fields)}'`;
  }
  if (testLinks.length > 1) {
    throw `Found duplicate links for '${JSON.stringify(fields)}'`;
  }
  let ldo = testLinks[0];
  return ldo;
}

/**
 * Resolve URI Templates from supplied data.
 *
 * For draft-04 Hyper-Schemas, interpret dotted variable
 * names as indexing further into objects or arrays.
 *
 * This is not part of the draft-04 spec, nor is the dot
 * behavior directly specified by the URI Template spec.
 * However, this is a common interpretation.
 *
 * Currently, all Hyper-Schemas are assumed to be draft-04.
 *
 * Starting in draft-07, the "templatePointers" field
 * will be used, and will be supported directly through
 * the (not yet existing) Hyper-Schema library.
 */
function resolveUri(ldo, templateValues) {
  if (!ldo.href) {
    throw 'No href to resolve!';
  }

  return uriTemplates(ldo.href).fill(varName => {
    let components = varName.split('.');
    let value = templateValues || {};
    for (let c of components) {
      value = value[c];
      if (value === undefined) {
        break;
      }
    }
    return value;
  });
}

module.exports = {
  extractLdos,
  extractLdo,
  resolveUri
};
