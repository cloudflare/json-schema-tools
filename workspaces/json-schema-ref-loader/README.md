# JSON Schema Reference Loader

Webpack loader that uses `@cloudflare/json-schema-transform` to load JSON Schema documents in JSON, JSON5, YAML, or JavaScript formats, and de-references all `$ref`s.  Circular references are not supported.
