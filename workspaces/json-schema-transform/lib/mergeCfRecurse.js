var _ = require('lodash');
var schemaWalk = require('@cloudflare/json-schema-walker');

/**
 * Perform the actual replacement/merge.
 * Only "type" and "required" are recognized and override any such
 * keywords in the replaced schema (these are the only ones currently
 * in use).  Any other keywords are silently dropped.
 *
 * Note that json-schema-example-loader will actually drop any
 * "required" inside the replacement schema even if there is no
 * "required" outside.  In order to move closer to the spec, this
 * code retains inside "required" keywords when they are not replaced.
 */
var _doMerge = function(schemaParent, schemaProp, rootSchemaNoLinks) {
  // We want the result to be a proper tree, so always clone the
  // root schema, even if we don't need to replace type or required.
  let newSchema = _.cloneDeep(rootSchemaNoLinks);

  if (schemaParent[schemaProp].type) {
    newSchema.type = schemaParent[schemaProp].type;
  }

  if (schemaParent[schemaProp].required !== undefined) {
    newSchema.required = schemaParent[schemaProp].required;
  }

  // Anything else that happens to be there is ignored.
  schemaParent[schemaProp] = newSchema;
};

/**
 * Removes "links" and "definitions" as they do not need
 * to be copied when replacing "cfRecurse": "".
 */
var _removeLinksAndDefs = function(subschema, path, parent) {
  if (subschema.hasOwnProperty('links')) {
    delete subschema.links;
  }
  if (subschema.hasOwnProperty('definitions')) {
    delete subschema.definitions;
  }
};

/**
 * Looks through all link href templates to find which
 * definitions are needed, and then removes all unneeded
 * definitions.  If no definitions remain, the definitions
 * keyword is removed entirely.
 *
 * Only variables that are URI fragments are considered,
 * as other variables do not link to the definitions.
 *
 * Currently, only top-level definitions are supported.
 */
var _pruneDefinitions = function(schema) {
  // This will pull out all {#/schema/pointers}
  const uriTemplateVariablesPattern = /{#(?:\/\w+)+}/g;
  const definitionNamePattern = /{#\/definitions\/(\w+)}/;

  let usedDefinitions = new Set();
  for (let link of schema.links) {
    let matches = link.href.match(uriTemplateVariablesPattern);
    for (let match of matches || []) {
      let captures = match.match(definitionNamePattern);
      if (captures === null) {
        throw `Unsupported template variable format '${match}'`;
      }
      usedDefinitions.add(captures[1]);
    }
  }

  for (let def in schema.definitions) {
    if (!usedDefinitions.has(def)) {
      delete schema.definitions[def];
    }
  }
  if (
    schema.definitions !== undefined &&
    !Object.getOwnPropertyNames(schema.definitions).length
  ) {
    // Remove if empty just to reduce visual noise.
    delete schema.definitions;
  }
};

/**
 * First trims the schema down to the minimum necessary size,
 * then goes through the links and replaces "cfRecurse": "" with
 * a version of the trimmed schema that has had "links" removed.
 *
 * This handles the very specific usage of "cfRecurse" with a
 * root pointer from within LDO subschemas.  Other cases will
 * result in undefined behavior.
 *
 * If "required" or "type" are present alongside of "cfRecurse",
 * they are copied into the replaced schema.  Any other keywords
 * are dropped.
 *
 * Note that without trimming schemas > 1GB can easily be produced.
 * We do not currently ever make use of links within a "cfRecurse",
 * so removing them further reduces the output schema size.
 *
 * If there are no links at the top level, we return the schema
 * unchaged (it is not trimmed).
 */
var mergeCfRecurse = function(schema, options) {
  if (schema.hasOwnProperty('links')) {
    // First remove unnecessary subschemas.  We use subschemaWalk()
    // instead of walkSchemas() because we want to keep the top-level
    // "links", and the top-level "definitions" is handled specially.
    if (schema.hasOwnProperty('definitions')) {
      module.exports._pruneDefinitions(schema);
    }
    schemaWalk.subschemaWalk(schema, module.exports._removeLinksAndDefs);

    for (let i = 0; i < schema.links.length; i++) {
      let ldo = schema.links[i];

      // Assign ids to LDO schemas to ensure that
      // the validator library does not get confused by
      // schemas that appear to have the same (empty) id.
      for (let schemaField of ['schema', 'targetSchema']) {
        if (ldo[schemaField] && ldo[schemaField].id === undefined) {
          // Note that trying to use multiple schema documents
          // without ids or with the same ids will produce the same
          // identifiers for links, so don't do that.
          ldo[schemaField].id = `${schema.id || ''}#/links/${i}/${schemaField}`;
        }
      }

      // Complete our top-level link hrefs if necessary.
      if (options && options.curl && options.curl.baseUrl) {
        let baseUrl = options.curl.baseUrl;
        // Technically this should be done as an RFC 3986
        // URI reference resolution, but in practice elsewhere
        // we just concatenate them, so do that here as well.
        ldo.href = baseUrl + ldo.href;
      }
    }

    // linksOnly lets us use subschemaWalk without hitting
    // any non-link subschemas.
    let linksOnly = { links: schema.links };

    // The no-link (and no-definitions, as we ony preserved it
    // for use with link hrefs) schema is to avoid copying
    // the links where they are not needed.
    let rootSchemaNoLinks = _.cloneDeep(schema);
    delete rootSchemaNoLinks.links;
    delete rootSchemaNoLinks.definitions;

    schemaWalk.subschemaWalk(linksOnly, (subschema, path, parent) => {
      if (subschema.cfRecurse === '') {
        let parentNode = parent;
        if (path.length > 1) {
          parentNode = schemaWalk.getSubschema(
            parent,
            path.slice(0, length - 1)
          );
        }

        module.exports._doMerge(
          parentNode,
          path[path.length - 1],
          rootSchemaNoLinks
        );
      }
    });
  }
};

// The leading-_ functions are exported for testing purposes only.
module.exports = {
  mergeCfRecurse,
  _doMerge,
  _pruneDefinitions,
  _removeLinksAndDefs
};
