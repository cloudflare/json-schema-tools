# Doca

Doca is an API documentation site scaffolding tool.

The name also refers to the whole system involved in the resulting site.  See the [https://github.com/cloudflare/json-schema-tools][Cloudflare JSON Schema Tools monorepo README] for a diagram of the system, as well as general requirements such as package management tool versions.

## Installation

```
yarn global add @cloudflare/doca
```

## Commands

### init

```
doca init [-i schema_folder] [-o project_folder] [-t theme_name]
```

Doca goes through the current dir (or `schema_folder`), looks for `**/*.json` files and generates a web site in `./documentation` (or `project_folder`). Doca has modular 3rd party themes. The default one is [doca-boostrap-theme](https://github.com/cloudflare/doca-bootstrap-theme). It can be aliased just as `bootstrap`. This command should be used only once when you need to bootstrap your project.

To use the resulting web site:
```
cd project_folder
yarn install
yarn start
```

### theme

```
doca theme newTheme project
```

This sets a different theme `newTheme` to the `project`. It has two steps:
- it calls `yarn add newTheme` inside of `project`
- renames all `doca-xxx-theme` references to `doca-newTheme-theme`
**This can make destructive changes in your project.** Always use version control!

**A note about package scopes:** While non-scoped themes can be referenced by their simple name (e.g. `newTheme` for `doca-newTheme-theme`), scoped theme packages such as `@myscope/doca-abc-theme` must be passed as the full package name, including the scope.

### help

```
doca --help
```

This lists the commands and their syntax.

## Further configuration

* The `config.js` file contains the default base URI and request headers for the API.
    * Request headers can be overridden (but they are overridden and not extended).  
    * With draft-04, the base URI cannot be changed.  Support for draft-07's `base` is forthcoming.
* The `schema.js` file contains the list of schemas, to which you may add.  You can change the order of the schemas in the output by changing their order in this file.

## Example usage

The repository includes some example schemas

```bash
git clone git@github.com:cloudflare/json-schema-tools.git
cd json-schema-tools
lerna bootstrap
cd doca/example-example-schemas/draft-04
doca init
cd documentation
```

**That's it!** Once installed, there are three ways to run the project:

1.  The development mode where you can make quick changes in your schemas and see the results immediately because of webpack and mighty hot reloading:

```bash
yarn install
yarn start
```

2.  A **static production-ready app**:

```bash
yarn install
yarn build
open build/index.html
```

3.  A static app built **without any JavaScript**:

```bash
yarn install
yarn build:nojs
open build/index.html
```

## Themes

**Themes are additional node modules**. A Doca theme is just a set of React components and style sheets.

Currently, the only theme available is the `@cloudflare/doca-default-theme` from this same repository.
For now, it simply displays the getting started text and the processed schemas.  We will
be gradually making this into a proper theme, but it can serve as a debuggging aid for
anyone using the underlying tools or wishing to build their own theme from scratch.

The older public theme, `doca-bootstrap-theme`, only works with the older `doca` and not
with this package, `@cloudflare/doca`).

You can **install any theme** with the command

```
doca theme THEME_NAME documentation
```

For non-scoped theme packages, you can use full name `doca-THEME_NAME-theme` or just shortcut `THEME_NAME`.

For scoped theme packages, you must use the full name `@myscope/doca-THEME_NAME-theme`


## Acknowledgements

Note that this is the `@cloudflare/doca` package.  It is a revision of an older package, simply named `doca`, which was written by @tajo.  This package has the same design and most of the same code as the previous package, but uses a different set of back-end tools, which provide a different interface for the themes.  In particular, the data structure seen by the themes is now a valid (although extended) JSON Schema.
