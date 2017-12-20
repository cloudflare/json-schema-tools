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
 * Convert our non-standard URI Templates to RFC 6570 ones
 * and resolve the from the available data.  RFC-compliant
 * variable names will work as-is, while the following
 * steps are applied to doca-style JSON Pointer variables:
 *
 * 1. Remove leading "#/definitions/" to avoid using the
 *    reserved "#" character and produce the primary
 *    variable name.
 * 2. If the variable ends with "identifier", replace
 *    that with "id", as our instance JSON always uses
 *    the shorter form.
 *
 * For both doca-compliant and RFC-compliant variables,
 * dotted variable names will be separated with each
 * component treated as another level of access.
 *
 * Examples using the following data object to resolve variables:
 * {
 *   "id": "1234",
 *   "zone_id": "5678",
 *   "zone_identifier": "9999",
 *   "zone": {
 *     "id": "1010",
 *   },
 * }
 *
 * A template of:
 *   "zones/{#/definitions/zone_identifier}/pagerules/{#/definitions/identifier}"
 * will produce:
 *   "zones/5678/pagerules/1234"
 *
 * A template of:
 *   "zones/{#/definitions/zone.identifier}/pagerules/{#/definitions/identifier}"
 * will produce:
 *   "zones/1010/pagerules/1234"
 *
 * A template of:
 *   "zones/{zone_identifier}"
 * will produce:
 *   "zones/9999"
 * because the variable is already RFC-compliant, so we do not examine
 * it for special "identifier" treatment.
 */
function resolveUri(ldo, templateValues) {
  if (!ldo.href) {
    throw 'No href to resolve!';
  }

  // Match only doca-compliant variables.
  let template = ldo.href.replace(/{#\/definitions\/.+?}/g, match => {
    // Strip off the prefix and truncate trailing 'identifier' to 'id'
    return match.replace('{#/definitions/', '{').replace(/identifier}$/, 'id}');
  });
  return uriTemplates(template).fill(varName => {
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
