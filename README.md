# JSON Schema Tools

This is a monorepo of packages for working with
[JSON Schema and JSON Hyper-Schema](http://json-schema.org),
built using [Lerna](https://github.com/lerna/lerna) and
[Yarn Workspaces](https://yarnpkg.com/lang/en/docs/workspaces/).

The packages are intended for general use, so
while they may support some Cloudflare extensions to JSON Schema,
they should all be usable with schemas that rely only on the
standard keywords and features.

## Scope

* Static processing of schemas
* Webpack loaders for using schemas within the browser
* API documentation based on JSON Hyper-Schema
* More?

## Installing and using a single package

Find the package in the [`workspaces/` directory](workspaces) and
open its README.md for documentation.

## Installing the monorepo

Please use the latest node (6+) and yarn v1+.  Simply clone the repository
and run `yarn install`.  A known good version of yarn is included in
the `scripts` directory and configured in this repository's `.yarnrc`.
