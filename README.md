# JSON Schema Tools

This is a monorepo of packages for working with
[JSON Schema and JSON Hyper-Schema](http://json-schema.org),
built using [Lerna](https://github.com/lerna/lerna) and
[Yarn Workspaces](https://yarnpkg.com/lang/en/docs/workspaces/).

The repo includes everything from generic utilities to small applications
built on these and other packages.

The packages are intended for general use, so
while they may support some Cloudflare extensions to JSON Schema,
they should all be usable with schemas that rely only on the
standard keywords and features.

Packages fall into a few categories.  The following diagram gives an overview of how schemas may be used by various packages in this repository.  Each package is described in more detail after the image.

![A possible json-schema-tools data flow can involve static schema transformations with the walker and transform packages, which can produce schemas suitable for use in applications such as the Doca API documentation system.  Alternatively, schemas can be used (typically as-is) for validating API data at runtime.](diagram-of-packages.png "Example data flows")

## Static analysis and manipulation

These tools work with schemas without any instance data.  Examples include transforming schemas from arrangements that are useful for schema maintenance into equivalent forms that better suit applications such as a documentation generator.

### `@cloudflare/json-schema-walker`

[`json-schema-walker`](workspaces/json-schema-walker/README.md) is the most fundamental static schema processing package: it is aware of subschema applicators and uses that knowledge to walk over a schema and make callbacks before and/or after visiting any subschemas.

Most schema transformations work by changing a schema object after its subschemas have been visited, so that all transformations are guaranteed to have already been applied to any subschemas.

There are variants for visiting all schemas including the root, as well as for only visiting subschemas.

### `@cloudflare/json-schema-transform`

[`json-schema-transform`](workspaces/json-schema-transform/README.md) is a collection of utility functions, most of which are either callbacks intended for use with `json-schema -walker`, or make use of `json-schema-walker` internally.

## Evaluating instances against schemas

_These packages have not yet been created._

While we do not include a validator, as many excellent ones are available, we do have packages that build on validation and hyper-schema.

Eventually we hope to provide a full JSON Hyper-Schema implementation and generic hyperclient, although this is some ways off.

### `@cloudflare/json-schema-test`

Applies schema validation to API requests and responses.  This primarily leverages JSON Hyper-Schema but other utilities such as a [Jest](https://facebook.github.io/jest/) matcher for regular schema validation are included.

### `@cloudflare/json-hyper-schema`

The beginnings of an implementation of JSON Hyper-Schema.

## Applications and application support

_These packages have not yet been created._

Currently, the only application provided is an API documentation system known as "Doca".  This is a refactored and re-designed version of [our existing Doca suite](https://github.com/cloudflare/doca)

### `@cloudflare/doca-scaffold`

Scaffolding system to generate API documentation apps.

Replaces the existing `doca` package, which is now deprecated.

### `@cloudflare/doca-loader`

[Webpack 2](https://webpack.js.org/) loader that uses `json-schema-transform` and other packages to convert a set of schemas into a form suitable for display as documentation.

Replaces both `json-schema-loader	` and `json-schema-example-loader` in the Doca system.  Note that `json-schema-loader` is still supported as it is a useful simple utility, while `json-schema-example-loader` is deprecated.

### `@cloudflare/doca-components`

React components for `doca-scaffold`-generated apps.  Exactly how these relate to or replace the old doca theme system is TBD.


## Installation

### Installing and using a single package

Find the package in the [`workspaces/` directory](workspaces) and
open its README.md for documentation.

## Installing the monorepo

Please use the latest node (6+) and yarn v1+.  Simply clone the repository
and run `yarn install`.  A known good version of yarn is included in
the `scripts` directory and configured in this repository's `.yarnrc`.

