// Custom walker for the tree-walk package that only visits schemas.

const NEXT_SCHEMA_KEYWORD = 'schemaWalk:nextSchemaKeyword';
const NEXT_LDO_KEYWORD = 'schemaWalk:nextLdoKeyword';

/**
 * Examine each possibly-subschema-containing keyword and apply
 * the callbacks to each subschema.  As links are more complex,
 * they are handed off to _processLinks();
 */

/**
 * Utility function for getting a subschema when
 * then number of path components is unknown.
 * Often useful in implementing callbacks that want to look
 * at the parent schema in some way.
 *
 * Returns undefined if the path cannot be fully applied.
 */
var getSubschema = function(schema, path) {
  let subschema = schema;
  for (let p of path) {
    if (subschema === undefined) {
      return undefined;
    }
    subschema = subschema[p];
  }
  return subschema;
};

/**
 * Get a vocabulary based on the $schema keyword, defaulting
 * to the most recent hyper-schema if none is present.
 */
var getVocabulary = function(schema, defaultVocabulary) {
  let vocabulary;
  if (schema.$schema) {
    try {
      vocabulary = {
        'http://json-schema.org/draft-04/schema#': DRAFT_04,
        'http://json-schema.org/draft-04/hyper-schema#': DRAFT_04_HYPER,
        'http://json-schema.org/draft-06/schema#': DRAFT_06,
        'http://json-schema.org/draft-06/hyper-schema#': DRAFT_06_HYPER,
        'http://json-schema.org/draft-07/schema#': DRAFT_07,
        'http://json-schema.org/draft-07/hyper-schema#': DRAFT_07_HYPER
      }[schema.$schema];
    } catch (e) {
      // fall through to default below
    }
  }
  if (vocabulary === undefined) {
    vocabulary = defaultVocabulary || DRAFT_07_HYPER;
  }
  return vocabulary;
};

/**
 * Walk the entire schema, including the root schema.
 */
var schemaWalk = function(schema, preFunc, postFunc, vocabulary) {
  preFunc && preFunc(schema, [], undefined, []);
  subschemaWalk(schema, preFunc, postFunc, [], vocabulary);
  postFunc && postFunc(schema, [], undefined, []);
};

/**
 * Walk a schema's subschemas.  The root schema is NOT
 * passed to the callbacks.  To include the root schema,
 * call schemaWalk().
 *
 * Deleting entire keywords is supported and handled
 * through the NEXT_SCHEMA_KEYWORD exception.
 *
 * Except for LDO keywords (see _processLinks()), deleting
 * specific subschemas from an object of subschemas, or
 * from a list of subschemas, is not supported and will
 * result in undefined behavior.
 */
var subschemaWalk = function(
  schema,
  preFunc,
  postFunc,
  parentPath,
  vocabulary
) {
  if (parentPath === undefined) {
    // Treat our parent schema as a root schema.
    parentPath = [];
  }

  if (!_isSchema(schema)) {
    throw 'Expected object or boolean as schema, got ' +
      (Array.isArray(schema) ? 'array' : typeof schema);
  }

  if (vocabulary === undefined) {
    vocabulary = getVocabulary(schema);
  }

  for (let keyword in schema) {
    try {
      _processSchemaKeyword(
        vocabulary,
        schema,
        keyword,
        preFunc,
        postFunc,
        parentPath
      );
    } catch (e) {
      if (e !== NEXT_SCHEMA_KEYWORD) {
        throw e;
      }
    }
  }
};

/**
 * Determine if something is (probably) a schema or not.
 * This is currently just a check for an object or a boolean,
 * which is the requirement for draft-06 or later.
 *
 * It is assumed that if strict draft-04 compliance is desired,
 * meta-schema validation will screen out any booleans for
 * keywords other than additionalProperties and additionalItems.
 *
 * Otherwise, this package will tolerate boolean schemas with
 * draft-04.
 */
var _isSchema = function(schema) {
  return (
    (schema instanceof Object && !Array.isArray(schema)) ||
    typeof schema === 'boolean'
  );
};

var _processSchemaKeyword = function(
  vocabulary,
  schema,
  keyword,
  preFunc,
  postFunc,
  parentPath
) {
  vocabulary[keyword] &&
    vocabulary[keyword](schema, keyword, preFunc, postFunc, parentPath);
};

/**
 * Apply callbacks to a single schema.
 */
var _processSingleSchema = function(
  schema,
  keyword,
  preFunc,
  postFunc,
  parentPath
) {
  _apply(schema, [keyword], preFunc, postFunc, parentPath);
};

/**
 * Apply callbacks to each schema in an array.
 */
var _processArrayOfSchemas = function(
  schema,
  keyword,
  preFunc,
  postFunc,
  parentPath
) {
  for (let i = 0; i < schema[keyword].length; i++) {
    _apply(schema, [keyword, i], preFunc, postFunc, parentPath);
  }
};

/**
 * Apply callbacks to either a single schema or an array of schemas
 */
var _processSingleOrArrayOfSchemas = function(
  schema,
  keyword,
  preFunc,
  postFunc,
  parentPath
) {
  if (_isSchema(schema[keyword])) {
    _processSingleSchema(schema, keyword, preFunc, postFunc, parentPath);
  } else {
    _processArrayOfSchemas(schema, keyword, preFunc, postFunc, parentPath);
  }
};

/**
 * Apply callbacks to each schema in an object.
 */
var _processObjectOfSchemas = function(
  schema,
  keyword,
  preFunc,
  postFunc,
  parentPath
) {
  for (let prop of Object.getOwnPropertyNames(schema[keyword])) {
    _apply(schema, [keyword, prop], preFunc, postFunc, parentPath);
  }
};

/**
 * Apply callbacks to each schema in an object, where each
 * property may hold either a subschema or something that
 * is recognizably not a schema, such as a string or number.
 */
var _processObjectOfMaybeSchemas = function(
  schema,
  keyword,
  preFunc,
  postFunc,
  parentPath
) {
  for (let prop of Object.getOwnPropertyNames(schema[keyword])) {
    if (_isSchema(schema[keyword][prop])) {
      _apply(schema, [keyword, prop], preFunc, postFunc, parentPath);
    }
  }
};

/**
 * Loop over the links and apply the callbacks, while
 * handling LDO keyword deletions by catching NEXT_LDO_KEYWORD.
 */
var _getProcessLinks = function(ldoVocabulary) {
  return function(schema, keyword, preFunc, postFunc, parentPath) {
    for (let i = 0; i < schema.links.length; i++) {
      let ldo = schema.links[i];
      for (let keyword in ldo) {
        try {
          ldoVocabulary[keyword] &&
            ldoVocabulary[keyword](
              schema,
              ['links', i, keyword],
              preFunc,
              postFunc,
              parentPath
            );
        } catch (e) {
          if (e !== NEXT_LDO_KEYWORD) {
            throw e;
          }
        }
      }
    }
  };
};

/**
 * Actually call the callbacks.
 *
 * If the preFunc callback deletes the entire keywords,
 * this throws NEXT_SCHEMA_KEYWORD.
 *
 * If it deletes a keyword within an LDO, it throws NEXT_LDO_KEYWORD.
 *
 * These exceptions allow callers to break out of loops that
 * would otherwise attempt to continue processing deleted subschemas.
 */
var _apply = function(schema, path, preFunc, postFunc, parentPath) {
  let subschema = getSubschema(schema, path);

  preFunc && preFunc(subschema, path, schema, parentPath);

  // Make sure we did not remove or change the subschema in question.
  subschema = getSubschema(schema, path);
  if (subschema === undefined) {
    if (path[0] === 'links' && schema.links !== undefined) {
      // Deleting the LDO keywords is allowed.  Deleting an entire
      // LDO is not and is documented to produce undefined behavior
      // so we do not check for it.
      throw NEXT_LDO_KEYWORD;
    }
    throw NEXT_SCHEMA_KEYWORD;
  }
  subschemaWalk(subschema, preFunc, postFunc, parentPath.concat(path));
  postFunc && postFunc(subschema, path, schema, parentPath);
};

const DRAFT_04 = {
  properties: _processObjectOfSchemas,
  patternProperties: _processObjectOfSchemas,
  additionalProperties: _processSingleSchema,
  dependencies: _processObjectOfMaybeSchemas,
  items: _processSingleOrArrayOfSchemas,
  additionalItems: _processSingleSchema,
  allOf: _processArrayOfSchemas,
  anyOf: _processArrayOfSchemas,
  oneOf: _processArrayOfSchemas,
  not: _processSingleSchema,
  if: _processSingleSchema,
  then: _processSingleSchema,
  else: _processSingleSchema
};

/**
 * LDO keywords call _apply directly as they have a different
 * mapping from the schema keyword into the path that _apply
 * expects.  This is done in the fuction returned from
 * _getProcessLinks();
 */
const DRAFT_04_HYPER_LDO = {
  schema: _apply,
  targetSchema: _apply
};

const DRAFT_04_HYPER = Object.assign({}, DRAFT_04, {
  links: _getProcessLinks(DRAFT_04_HYPER_LDO)
});

const DRAFT_06 = Object.assign({}, DRAFT_04, {
  propertyNames: _processObjectOfSchemas
});

const DRAFT_06_HYPER_LDO = {
  hrefSchema: _apply,
  targetSchema: _apply,
  submissionSchema: _apply
};

const DRAFT_06_HYPER = Object.assign({}, DRAFT_06, {
  links: _getProcessLinks(DRAFT_06_HYPER_LDO)
});

const DRAFT_07 = Object.assign({}, DRAFT_06);

const DRAFT_07_HYPER_LDO = Object.assign({}, DRAFT_06_HYPER_LDO, {
  headerSchema: _apply
});

const DRAFT_07_HYPER = Object.assign({}, DRAFT_07, {
  links: _getProcessLinks(DRAFT_07_HYPER_LDO)
});

const CLOUDFLARE_DOCA = Object.assign({}, DRAFT_04, {
  links: _getProcessLinks(
    Object.assign({}, DRAFT_04_HYPER_LDO, DRAFT_07_HYPER_LDO)
  )
});

module.exports = {
  getSubschema,
  getVocabulary,
  schemaWalk,
  subschemaWalk,
  vocabularies: {
    DRAFT_04,
    DRAFT_04_HYPER,
    DRAFT_04_HYPER_LDO,
    DRAFT_06,
    DRAFT_06_HYPER,
    DRAFT_06_HYPER_LDO,
    DRAFT_07,
    DRAFT_07_HYPER,
    DRAFT_07_HYPER_LDO,
    CLOUDFLARE_DOCA
  }
};
