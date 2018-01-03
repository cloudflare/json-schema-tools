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

  items: _collapseArrayOrSingleSchemas,
  additionalItems: _notSupported,
  minItems: _collision,
  maxItems: _collision,
  uniqueItems: _or,

  properties: _collapseObjectOfSchemas,
  patternProperties: _collapseObjectOfSchemas,
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
 * Handles "items" or any future keyword that can take either a
 * single subschema or an array of subschemas.
 *
 * TODO: Actually handle arrays.  For now we punt.
 *
 * TODO: The interaction between "items" and "additionalItems" is
 *       complex, and we currently punt on it entirely.  Properly
 *       supporting the keyword would also allow collapsing "items"
 *       when one value is an array and the other is a single schema.
 */
function _collapseArrayOrSingleSchemas(
  parent,
  parentPath,
  subschema,
  vocab,
  keyword
) {
  if (
    keyword === 'items' &&
    (parent.hasOwnProperty('additionalItems') ||
      subschema.hasOwnProperty('additionalItems'))
  ) {
    throw `"additionalItems" not supported at /${parentPath.join('/')}`;
  }

  if (Array.isArray(parent[keyword]) || Array.isArray(subschema[keyword])) {
    throw `Array form of "items" not supported at /${parentPath.join('/')}`;
  }

  // Use "this" to facilitate mocking and testing.
  this.collapseSchemas(
    parent[keyword],
    parentPath.concat([keyword]),
    subschema[keyword],
    vocab
  );
}

/**
 * Handles any keyword with an object of subschemas for a value.
 * TODO: The interactions among "properties", "patternProperties",
 *       and "additionalProperties" are complex, and we currently
 *       punt on it.
 */
function _collapseObjectOfSchemas(
  parent,
  parentPath,
  subschema,
  vocab,
  keyword
) {
  if (
    (keyword === 'properties' || keyword === 'patternProperties') &&
    (parent.hasOwnProperty('additionalProperties') ||
      subschema.hasOwnProperty('additionalProperties'))
  ) {
    throw `"additionalProperties" not supported at /${parentPath.join('/')}`;
  }

  for (let prop of _.union(
    Object.keys(parent[keyword]),
    Object.keys(subschema[keyword])
  )) {
    if (!parent[keyword].hasOwnProperty(prop)) {
      // Then it must be in only the subschema, so just add it to the parent.
      parent[keyword][prop] = subschema[keyword][prop];
    } else if (subschema[keyword].hasOwnProperty(prop)) {
      // They both have this property, so collapse them.
      // Use "this" to facilitate mocking and testing.
      this.collapseSchemas(
        parent[keyword][prop],
        parentPath.concat([keyword, prop]),
        subschema[keyword][prop],
        vocab
      );
    } else {
      // The prop is just in the parent, so there's nothing to do.
    }
  }
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
  if (parent === true || (parent !== false && subschema === false)) {
    // TODO: Not yet entirely clear how to handle boolean schema collapse
    //       when we normally modify the parent schema object in place.
    //       There are several options including making another attempt
    //       at using an immutable library instead.
    throw `Cannot collapse boolean schemas at /${parentPath.join('/')}`;
  }

  if (parent === false || subschema === true) {
    // Either the parent is already fully constrained, or the subschema
    // explicitly does not add further constraints, so there is nothing
    // to do.
    return parent;
  }

  // Both are object schemas.
  // NOTE: $ref and cfRecurse MUST first be pre-processed out.
  for (let k of Object.keys(subschema)) {
    if (parent.hasOwnProperty(k) && vocab[k] !== undefined) {
      // Use the vocabulary's function to handle keywords that
      // exist in both the parent and subschema.
      vocab[k](parent, parentPath, subschema, vocab, k);
    } else {
      // The property is only in the subschema, copy to parent.
      parent[k] = subschema[k];
    }
  }
  return parent;
}

/**
 * Returns a function suitable for use as a *post*-walk callback
 * for json-schema-walker which flattens "allOf" keywords as
 * much as possible, using the vocabularies provided.
 *
 * Constants for the supported drafts of the standard vocabulary
 * are provided by this module, as is a constant for the extension
 * vocabulary used by Cloudflare's Doca suite.
 */
function getCollapseAllOfCallback(schemaUri, ...additionalVocabularies) {
  let vocab = {};

  // Use "this" to facilitate mocking and testing.
  switch (schemaUri) {
    case 'http://json-schema.org/draft-04/schema#':
      Object.assign(vocab, this.DRAFT_04);
      break;
    case 'http://json-schema.org/draft-04/hyper-schema#':
      Object.assign(vocab, this.DRAFT_04_HYPER);
      break;
  }

  if (additionalVocabularies.length) {
    Object.assign(vocab, ...additionalVocabularies);
  }

  return (subschema, path, parent, parentPath) => {
    // Note that subschema is passed as the initial *parent*, as we
    // are collapsing the subschema's "allOf" subschemas.
    // This process does not use the parent passed to this callback.
    if (subschema instanceof Object && subschema.hasOwnProperty('allOf')) {
      _.reduce(
        subschema.allOf,
        (subAsParent, schemaFromAllOf) => {
          // Use "this" to facilitate mocking and testing.
          this.collapseSchemas(
            subAsParent,
            parentPath.concat(path),
            schemaFromAllOf,
            vocab
          );
          return subAsParent;
        },
        subschema
      );
      delete subschema.allOf;
    }
  };
}

// Note that functions with a leading _ are exported only for
// testing purposes.  In particular, they should not be re-exported
// via index.js
module.exports = {
  DRAFT_04,
  DRAFT_04_HYPER,
  CLOUDFLARE_DOCA,
  getCollapseAllOfCallback,
  collapseSchemas,
  _or,
  _arrayUnion,
  _collapseArrayOrSingleSchemas,
  _collapseObjectOfSchemas,
  _parentWins,
  _collision,
  _notSupported
};

Object.assign(module.exports, {
  DRAFT_O4: DRAFT_04,
  DRAFT_04_HYPER: DRAFT_04_HYPER,
  CLOUDFLARE_DOCA: CLOUDFLARE_DOCA
});
