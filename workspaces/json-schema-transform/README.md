# JSON Schema Transform

A collection of utilities for analyzing and manipulating JSON Schemas statically (without an instance).

Currently, the transformations fall into two categories:

## Loading and dereferencing

The `AutoExtensionDereferencer` class can parse JSON Schemas in JSON, JSON5, YAML, and JavaScript format, and uses the [json-schema-ref-parser](https://github.com/BigstickCarpet/json-schema-ref-parser) package to remove all `$ref`s.  When dereferencing, no circular references are allowed.

This functionality is used by `@cloudflare/json-schema-ref-loader`.

## Producing API documentation-friendly schemas

Several utilities are packaged up as `processApiDocSchema()`
which does the following, all of which can be accessed as
individual functions.  These functions generally assume that
`$ref`s have been dereferenced, which means that circular
references are not (yet) supported.

The API documentation processing involves:
* Collapsing `allOf`s on the assumption that they are used to glue subschemas together, and should not be visible to documentation readers
* Replace `"cfRecurse": ""` with a copy of the non-`links` and non-`definitions` portion of a schema data structure (this may be changed to work without making a copy in the future, particularly if the similar `$recurse` proposed keyword makes it into draft-08)
* Build examples out of individual object property and array item `example` values
* Construct an example invocation of `curl` for each link, using the rolled-up `example`

This functionality is used by `@cloudflare/json-schema-apidoc-loader`.
