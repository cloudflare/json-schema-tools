# JSON Schema API Documentation Loader

Webpack loader that uses `@cloudflare/json-schema-transform` to convert JSON Hyper-Schema documents that do not have `$ref`s into a form suitable for generating human-readable API documentation.

The resulting schemas validate the same set of instances as the input schemas, but simplify the structure as much as possible.  Additionally, the `example` and `cfCurl` fields contain example values that documentation UIs can display.
