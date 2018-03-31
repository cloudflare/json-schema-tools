const walker = require('@cloudflare/json-schema-walker');
const mergeCfRecurse = require('./mergeCfRecurse');
const collapser = require('./allOf');
const example = require('./example');

/**
 * Process a dereferenced (no "$ref") hyper-schema into a form most suitable
 * for rendering API documentation.  This involves:
 *  - De-referencing the Doca extension keyword "cfRecurse"
 *  - Collapsing "allOf", on the assumption that it is used as glue rather
 *    then to indicate structure that programmers should care about.
 *  - Rolling up "example" fields so that object and array schemas that
 *    do not define their own example, but which have examples defined
 *    for all properties or items, gain an example built from those
 *    property and item examples.
 *  - Generating a curl request (with syntax typical of curl on *NIX)
 *    for each endpoint that uses the rolled up examples.
 *  - draft-04 hyper-schema is assumed if there is no "$schema" keyword.
 *
 * The currently supported options in the second parameter are:
 *  - baseUri:
 *      An absolute URI against which the link hrefs will be resolved
 *      to produce example requests.  In general, this should end
 *      in a "/" while the link hrefs should *NOT* begin with a "/",
 *      in order for RFC 3986 URI reference resolution to be functionally
 *      equivalent to string concatenation.  Otherwise many people find
 *      the results to be counter-intuitive.
 *  - globalHeaderSchema:
 *      A schema for headers that, by default, should always be sent
 *      with every request.  The header schemas should have "example"
 *      fields that are used to generate example requests.  These
 *      defaults can be overridden (not extended) for each link
 *      with the "headerSchema" keyword.
 *
 * Notable limitations aside from not allowing references include:
 *  - Some "allOf" combinations cannot be collapsed, and we currently
 *    do not support leaving such combinations present as "allOf"s.
 *  - It is possible in complex schemas to end up with an example
 *    that is not valid against the processed schema.  For instance,
 *    if an example of "Hello, world!" comes from an "allOf" subschema
 *    that just defines a type of string, but another subschema in the
 *    allOf sets a maxLength of 5, "Hello, world!" is longer than five
 *    characters and is now an invalid example.  Currently, such situations
 *    are not automatically detected.
 *  - Currently, Cloudflare's Doca extensions are always assumed to be
 *    in use.  This is only a limitation if identically named keywords
 *    are being used with a different intended behavior.  Doca keywords
 *    are prefixed with "cf" to make this unlikely.
 *  - In the absence of $schema, we assume JSON Hyper-Schema draft-04.
 */
function processApiDocSchema(schema, options) {
  let walkerVocab = Object.assign(
    {},
    walker.getVocabulary(schema, walker.vocabularies.DRAFT_04_HYPER),
    walker.vocabularies.CLOUDFLARE_DOCA
  );

  mergeCfRecurse.mergeCfRecurse(schema, walkerVocab);

  let collapseCallback = collapser.getCollapseAllOfCallback(
    schema.$schema || 'http://json-schema.org/draft-04/hyper-schema#',
    collapser.vocabularies.CLOUDFLARE_DOCA
  );

  // TODO: In theory, these two could be combined into one walk,
  //       as they both only work with subschemas, but in practice
  //       that does not work.  Need to investigate.
  walker.schemaWalk(
    schema,
    null,
    (...args) => {
      collapseCallback(...args);
    },
    walkerVocab
  );
  walker.schemaWalk(
    schema,
    null,
    (...args) => {
      example.rollUpExamples(...args);
    },
    walkerVocab
  );

  // Curl examples need to be run through the walker
  // separately, because they need the root schema
  // to be fully processed by the previous steps,
  // and the walker visits it last.
  let curlCallback = example.getCurlExampleCallback(
    schema,
    (options && options.baseUri) || '',
    (options && options.globalHeaderSchema) || {}
  );
  walker.schemaWalk(schema, null, curlCallback, walkerVocab);
  return schema;
}

module.exports = {
  processApiDocSchema
};
