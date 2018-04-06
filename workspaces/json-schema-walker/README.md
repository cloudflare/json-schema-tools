# JSON Schema Walker

A system that visits all schema objects in a JSON Schema document
and makes callbacks before and/or after visiting all of the current
schema object's subschemas.

Currently, there are several vocabularies to choose from, which must
be used with the two walking functions.  As the [vocabulary concept](https://github.com/json-schema-org/json-schema-spec/issues?q=is%3Aissue+is%3Aopen+label%3Avocabulary)
is finalized in JSON Schema [draft-08](https://github.com/json-schema-org/json-schema-spec/milestone/6), this package will be reworked to support it directly.

### The walkers

Both walkers accept one or two callback functions, but differ
slightly in their behavior.  In both cases, there are "path"
or "parentPath" concepts which are arrays of the JSON property
names or array indexes followed to reach the current schema.

Note that walker callbacks are expected to modify the
schema structure _in place_, so clone a copy if you need
the original as well.

#### `schemaWalk(schema, preFunc, postFunc, vocabulary)`

This simply calls the preFunc callback (if there is one),
calls `subschemaWalk` wth an empty parent path of `[]`, and
then calls the postFunc callback.

#### `subschemaWalk(scheam, preFunc, postFunc, parentPath, vocabulary)`

Sometimes it is useful to start somewhere within a document,
which `subschemaWalk` accomplishes by taking a parent path.
This is also how the recursive calls are made once you start
a walk- the parent path for each subsequent call is calculated
during the walk.

In particular, handling the root schema differently is common,
so calling `subschemaWalk` direclty on the root with an empty
parent path `[]` allows skipping the root schema.

### The callbacks

Either the `preFunc` or `postFunc` call can be null, or both can be passed for the same walk.  They are expected to take the following
as positional parameters:

1. The schema object (or boolean) being processed
2. The path to the schema from its parent
3. The parent schema object, if any
4. The path from the schema document root to the parent

Paths are arrays of property names (strings) and array indices (integers) that are analogous to [JSON Pointers](https://tools.ietf.org/html/rfc6901).  Given `["foo", 42]` as the path from the root to the parent object, and `["bar"]` as the path from the parent object to the schema being processed, the equivalent [JSON Pointer fragment](https://tools.ietf.org/html/rfc6901#section-6) for the parent would be `"#/foo/42`, while for the schema being processed it would be `#/foo/42/bar`.

The equivalent [Relative JSON Pointer](https://tools.ietf.org/html/draft-handrews-relative-json-pointer-01) from the parent to the schema being processed would be `0/bar`.

An empty path is represented as an empty array `[]`.  For a pointer from the root, this is equivalent to `#` as a JSON Pointer fragment.  

For an empty path from the parent to the schema being processed (meaning that both are the same, which happens for the root schema), this is equivalent to `0` as a Relative JSON Pointer.

### Vocabularies

`getVocabulary(schema, defaultVocabulary)` This returns the walker vocabulary object based on the schema's `$schema` keyword, or returns the default that you pass in if `$schema` is not present or not recognized.  The current default if none is provided is [Draft-07 JSON Hyper-Schema](https://tools.ietf.org/html/draft-handrews-json-schema-hyperschema-01).

Once draft-08 is published with a formalized concept of a schema vocabulary, the vocabulary implementation for this package will likely be substantially reworked.


