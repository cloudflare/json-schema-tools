// Custom walker for the tree-walk package that only visits schemas.

const NEXT_SCHEMA_KEYWORD = 'schemaWalk:nextSchemaKeyword';
const NEXT_LDO_KEYWORD = 'schemaWalk:nextLdoKeyword';

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
 * Walk the entire schema, including the root schema.
 */
var schemaWalk = function(schema, preFunc, postFunc) {
  preFunc && preFunc(schema, [], undefined, []);
  subschemaWalk(schema, preFunc, postFunc, []);
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
var subschemaWalk = function(schema, preFunc, postFunc, parentPath) {
  if (parentPath === undefined) {
    // Treat our parent schema as a root schema.
    parentPath = [];
  }

  if (typeof schema === 'boolean') {
    // In draft-04, two keywords can take boolean schemas
    // In draft-06, all schemas can be boolean
    return;
  } else if (Array.isArray(schema) || !(schema instanceof Object)) {
    throw 'Expected object or boolean as schema, got ' +
      (Array.isArray(schema) ? 'array' : typeof schema);
  }

  for (let keyword in schema) {
    try {
      _processSchemaKeyword(schema, keyword, preFunc, postFunc, parentPath);
    } catch (e) {
      if (e !== NEXT_SCHEMA_KEYWORD) {
        throw e;
      }
    }
  }
};

/**
 * Examine each possibly-subschema-containing keyword and apply
 * the callbacks to each subschema.  As links are more complex,
 * they are handed off to _processLinks();
 */
var _processSchemaKeyword = function(
  schema,
  keyword,
  preFunc,
  postFunc,
  parentPath
) {
  if (
    keyword === 'properties' ||
    keyword === 'extraProperties' ||
    keyword === 'patternProperties' ||
    keyword === 'dependencies'
  ) {
    for (let prop of Object.getOwnPropertyNames(schema[keyword])) {
      // "dependencies" can have a mix of schemas and strings.
      if (schema[keyword][prop] instanceof Object) {
        _apply(schema, [keyword, prop], preFunc, postFunc, parentPath);
      }
    }
  } else if (
    keyword === 'additionalProperties' ||
    keyword === 'additionalItems' ||
    keyword === 'not' ||
    (keyword === 'items' && !Array.isArray(schema.items))
  ) {
    _apply(schema, [keyword], preFunc, postFunc, parentPath);
  } else if (
    (keyword === 'items' && Array.isArray(schema.items)) ||
    keyword === 'allOf' ||
    keyword === 'anyOf' ||
    keyword === 'oneOf'
  ) {
    for (let i = 0; i < schema[keyword].length; i++) {
      _apply(schema, [keyword, i], preFunc, postFunc, parentPath);
    }
  } else if (keyword === 'links') {
    _processLinks(schema, preFunc, postFunc, parentPath);
  }
};

/**
 * Loop over the links and apply the callbacks, while
 * handling LDO keyword deletions by catching NEXT_LDO_KEYWORD.
 */
var _processLinks = function(schema, preFunc, postFunc, parentPath) {
  for (let i = 0; i < schema.links.length; i++) {
    let ldo = schema.links[i];
    for (let ldoSchemaProp of ['schema', 'targetSchema']) {
      if (ldo.hasOwnProperty(ldoSchemaProp)) {
        try {
          _apply(
            schema,
            ['links', i, ldoSchemaProp],
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
  }
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

module.exports = {
  getSubschema,
  schemaWalk,
  subschemaWalk
};
