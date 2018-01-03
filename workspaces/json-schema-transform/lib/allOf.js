const _ = require('lodash');
const schemaWalker = require('@cloudflare/json-schema-walker');

// TODO: Most of the _collision fields can be handled in other
//       ways not yet implemented.
const DRAFT_04_NO_ID = {
  type: _collision,
  enum: _collision,

  minimum: _collision,
  maximum: _collision,
  multipleOf: _collision,

  minLength: _collision,
  maxLength: _collision,
  pattern: _collision,

  items: _collision,
  additionalItems: _notSupported,
  minItems: _collision,
  maxItems: _collision,
  uniqueItems: _or,

  properties: _collision,
  patternProperties: _collision,
  additionalProperties: _notSupported,
  dependencies: _collision,

  required: _arrayUnion,
  minProperties: _collision,
  maxProperties: _collision,

  // "allOf" will always be handled separately, but just
  // in case it is seen, _parentWins is effectivley a no-op.
  allOf: _parentWins,
  anyOf: _collision,
  oneOf: _collision,
  not: _collision,

  title: _parentWins,
  description: _parentWins,
  default: _parentWins,

  format: _collision,

  // TODO: Not really correct, but right now we're not using nested
  //       definitions anyway and we require all $refs to be dereferenced.
  //       So dropping definitions in subschemas is fine for now.
  definitions: _parentWins,

  // For now, require $refs to be dereferenced before collapsing.
  $ref: _notSupported
};

// TODO: id shouldn't really be "parent wins" but it's sufficient for now.
const DRAFT_04 = Object.assign({}, DRAFT_04_NO_ID, {
  id: _parentWins
});

const DRAFT_04_HYPER = Object.assign({}, DRAFT_04, {
  links: _arrayUnion,
  readOnly: _or,
  media: _collision,
  pathStart: _notSupported,
  fragmentResolution: _notSupported
});

// Some things that are assigned _parentWins() should probably have
// more sophisticated behavior but this is fine for parity with the
// existing Doca suite code.
const CLOUDFLARE_DOCA = {
  $comment: _parentWins,
  example: _parentWins,
  cfPrivate: _or,
  cfOmitFromExample: _or,
  cfExtendedDescription: _parentWins,
  cfNotes: _parentWins,
  cfLinkErrors: _arrayUnion,
  cfSectionNotes: _arrayUnion,

  // For now, require cfRecurse to always be preprocessed out.
  cfRecurse: _notSupported
};

/*******************************************************
 * Collapser Functions
 *
 * All of these functions modify the supplied parent, and do
 * not modify the subschema.  This is in accordance with the
 * json-schema-walker package allowing in-place modification
 * due to memory consumption problems with copies even when
 * an immutable library is used.
 ********************************************************/

/**
 * Logically ORs the subschema value into the parent.
 */
function _or(parent, parentPath, subschema, vocab, keyword) {
  parent[keyword] = parent[keyword] || subschema[keyword];
}

/**
 * Sets parent to an array containing all values that appear
 * in either the parent or the subschema.
 */
function _arrayUnion(parent, parentPath, subschema, vocab, keyword) {
  parent[keyword] = _.unionWith(parent[keyword], subschema[keyword], _.isEqual);
}

/**
 * Ignores the subschema value.  In other words, a no-op that exists
 * to make handling such keywords explicit rather than it looking
 * like they were forgotten when examining the vocabulary structure.
 */
function _parentWins(parent, parentPath, subschema, vocab, keyword) {
  // Nothing to see here...
}

/**
 * Handle keywords that cannot be collapsed. For now, just throw an exception.
 * TODO: preserve a limited use of "allOf" for those keywords that
 *       cannot be factored out.
 */
function _collision(parent, parentPath, subschema, vocab, keyword) {
  if (!_.isEqual(parent[keyword], subschema[keyword])) {
    throw `Collision for keyword "${keyword}" at /{$parentPath.join('/')`;
  }
}

/**
 * Used for keywords that should cause the entire process to fail if
 * we're asked to do anything with them at all.
 */
function _notSupported(parent, parentPath, subschema, vocab, keyword) {
  throw `Keyword "${keyword}" not supported at /${parentPath.join('/')}`;
}

/**
 * Use a vocabulary to collapse subschemas into a parent schema
 * to whatever extent is possible.
 */
function collapseSchemas(parent, parentPath, subschema, vocab) {
  throw 'Not implemented yet!';
}

// Note that functions with a leading _ are exported only for
// testing purposes.  In particular, they should not be re-exported
// via index.js
module.exports = {
  DRAFT_04,
  DRAFT_04_HYPER,
  CLOUDFLARE_DOCA,
  collapseSchemas,
  _or,
  _arrayUnion,
  _parentWins,
  _collision,
  _notSupported
};

Object.assign(module.exports, {
  DRAFT_O4: DRAFT_04,
  DRAFT_04_HYPER: DRAFT_04_HYPER,
  CLOUDFLARE_DOCA: CLOUDFLARE_DOCA
});
