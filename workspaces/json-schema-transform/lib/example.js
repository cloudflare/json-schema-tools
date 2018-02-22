const stableStringify = require('json-stable-stringify');
const ldoUtils = require('./ldo');

/**
 * Determine the most likely primary type of any instance that
 * validates against the subschema.
 *
 * If we don't have a type and can't infer one from keywords,
 * but do have "oneOf" or "anyOf", then the return value will
 * be 'multi' rather than one of the actual JSON Schema types.
 *
 * Leave the type undefined if it cannot be determined, as
 * we might be able to get an example from "default" still.
 */
function _determineType(subschema) {
  // First figure out what kind of example we need.  Technically,
  // JSON Schema keywords do not imply type, but for the purpose
  // of generating examples they make acceptable hints.
  let type = subschema.type;

  if (Array.isArray(type)) {
    // Just use the first type, and hope it makes sense.
    type = type[0];
  }

  // Sometimes there will be a type alongside a "*Of" without
  // any other keywords that are usable for building an example.
  // Set the type to 'multi' to indicate that we should ignore
  // local keywords and instead look in the "*Of" keywords.
  if (
    ((type === 'object' &&
      (!subschema.properties &&
        !subschema.patternProperties &&
        !subschema.additionalProperties)) ||
      (type === 'array' && !subschema.items)) &&
    (subschema.oneOf || subschema.anyOf)
  ) {
    type = 'multi';
  }

  if (type === undefined) {
    if (
      subschema.properties ||
      subschema.patternProperties ||
      subschema.additionalProperties
    ) {
      type = 'object';
    } else if (subschema.items) {
      type = 'array';
    } else if (subschema.oneOf || subschema.anyOf) {
      type = 'multi';
    }
  } else if (
    !subschema.hasOwnProperty('example') &&
    (subschema.oneOf || subschema.anyOf)
  ) {
    // Only override the explicit type if there is no local example
    // but there are subschemas that might contribute an example.
    type = 'multi';
  }
  return type;
}

/**
 * Roll up examples for use from the root schema, or the root of
 * schemas inside of Link Description Objects.  Schema objects
 * that already have an "example" field are left alone, although
 * the roll up will be run on subschemas.
 *
 * In order for a roll up to occur, all required fields or
 * array elements must have an example value.  Otherwise the
 * parent is not assigned an example.
 *
 * Fields with cfOmitFromExample set to true will, as one
 * might guess, be omitted from the rolled up example.
 * Examples given for such fields may still be used outside
 * of the roll up.
 *
 * Note that examples are still created for cfPrivate schemas
 * and endpoints.  UIs should decide what, if anything, to do
 * with such examples.
 *
 * Some assumptions are made about types and complex schemas.
 *
 *    * If multiple "type" values are present, the first is used.
 *    * If there is no "type", then we assume an object if
 *      at least one property description keyword is present,
 *      and otherwise an array if "items" is present.
 *    * If "oneOf" or "anyOf" is present, we use the first subschema
 *      that has a defined example.
 *    * If both are present, "oneOf" is searched first (this is
 *      arbitrary).
 *
 * This is intended for use with @cloudflare/json-schema-walker
 * as a post-walk callback, which is why the rollup is done in the
 * subschema rather than the parent.  All of the subschema's subschemas
 * are guaranteed * to have been visited, while adjacent subschemas in
 * the parent may not have been.
 */
function rollUpExamples(subschema, path, parent, parentPath) {
  if (
    subschema === true ||
    subschema === false ||
    subschema.hasOwnProperty('example')
  ) {
    // Nothing to do as boolean schemas don't use examples.
    // Also, if there's already an example, just leave it as-is.
    return;
  }

  let type = _determineType(subschema);

  let example;
  switch (type) {
    case 'multi':
      let alternatives = (subschema.oneOf || []).concat(subschema.anyOf || []);
      for (let i = 0; i < alternatives.length; i++) {
        if (alternatives[i].hasOwnProperty('example')) {
          // We're only choosing one alternative, so exit the loop immediately.
          subschema.example = alternatives[i].example;
          break;
        }
      }
      break;

    case 'object':
      if (!subschema.properties) {
        return;
      }

      subschema.example = {};
      for (const prop in subschema.properties) {
        if (!subschema.properties[prop].cfOmitFromExample) {
          if (subschema.properties[prop].hasOwnProperty('example')) {
            subschema.example[prop] = subschema.properties[prop].example;
          } else if (subschema.required && subschema.required.includes(prop)) {
            // This is a required property that must be included
            // in the rollup, but it does not have an example so we
            // cannot do the rollup.
            delete subschema.example;
            return;
          }
        }
      }

      // If we didn't find any examples to roll up, remove the rollup.
      if (!Object.keys(subschema.example).length) {
        delete subschema.example;
      }

      // TODO: Something for "patternProperties" and "additionalProperties"?
      //       For now, objects using these keywords should provide examples
      //       at the parent object level.
      // TODO: Handle minProperties > 1, which is almost always used with either
      //       patternProperties or additionalProperties, but technially can be
      //       used with properties as well.
      break;

    case 'array':
      // First figure out if we have the necessary example field(s) to roll up
      let hasSingleItems = false;
      let hasArrayItems = false;
      let hasAddlItems = false;
      let hasEnoughItems = true;

      if (Array.isArray(subschema.items)) {
        hasArrayItems = subschema.items.reduce((hasExamples, current) => {
          return hasExamples && current.hasOwnProperty('example');
        }, true);

        hasAddlItems =
          subschema.additionalItems &&
          subschema.additionalItems.hasOwnProperty('example');

        hasEnoughItems =
          !subschema.minItems ||
          hasAddlItems ||
          subschema.minItems <= subschema.items.length;
      } else {
        hasSingleItems =
          subschema.items && subschema.items.hasOwnProperty('example');
      }

      if (!(hasSingleItems || (hasArrayItems && hasEnoughItems))) {
        // We can't roll up an example, so we're done.
        return;
      }

      // Now build the example.  We know that we have whatever
      // example fields that we need, so no need for further checks.
      if (hasArrayItems) {
        subschema.example = subschema.items.map(e => e.example);
        if (hasAddlItems) {
          subschema.example.push(subschema.additionalItems.example);
        }
      } else {
        // We must be in the single items case because otherwise
        // we would have exited earlier.  Making this an else if
        // to be explicit about it makes the implied else unreachable
        // and causes test coverage reports to complain.
        subschema.example = [subschema.items.example];
      }

      if (subschema.minItems && subschema.minItems > subschema.example.length) {
        let addlExample = hasArrayItems
          ? subschema.additionalItems.example
          : subschema.items.example;
        let oldLength = subschema.example.length;
        subschema.example.length = subschema.minItems;
        subschema.example.fill(addlExample, oldLength);
      }
      break;

    default:
      // The default value, if it exists, is the example of last resort.
      if (subschema.hasOwnProperty('default')) {
        subschema.example = subschema.default;
      }
  }
}

/**
 * Get a callback that will build curl request examples under every
 * link.  This needs to be run after the example fields for every
 * schema have been rolled up, including schemas under "definitions".
 *
 * In addition to providing the root schema that will be walked over
 * with the callback, this allows for providing a base URI against
 * which all hrefs are resolved, and a schema (with rolled-up example)
 * for headers to use with all examples unless overridden.
 */
function getCurlExampleCallback(rootSchema, baseUri, globalHeaders) {
  return function(subschema, path, parent, parentPath) {
    // This only processes link request and response subschemas,
    // and we only want to process links that have already had
    // all of their subschemas processed.  So look for links
    // in the current subschema.
    //
    // cfHidden schemas use links for titles but have no href
    // or schema content, so always skip those no matter where
    // in the schema we are.
    if (rootSchema.cfHidden || !subschema.links) {
      return;
    }

    subschema.links.forEach(ldo => {
      // The way we use draft-04, "schema" is the request schema and
      // "targetSchema" is the response schema.  This is not correct,
      // but it is how most people have (mis)interpreted the spec.
      let method = ldo.method ? ldo.method.toUpperCase() : 'GET';

      // TODO: Resolve against base URI according to RFC 3986.
      let uri =
        baseUri +
        ldoUtils.resolveUri(
          ldo,
          rootSchema.example,
          ldo.hrefSchema && ldo.hrefSchema.example
        );

      let dataString = '';
      if (ldo.schema) {
        if (method === 'GET' || ldo.encType === 'multipart/form-data') {
          let params = [];
          // sort for repeatable testing
          for (let [param, value] of Object.entries(
            ldo.schema.example
          ).sort()) {
            params.push(`${param}=${value}`);
          }
          if (method === 'GET') {
            // TODO: Handle URIs with query in place while we transition
            //       from draft-04 schema + method to draft-07 hrefSchema.
            uri += `?${params.join('&')}`;
          } else {
            dataString = `--form '${params.join(';')}'`;
          }
        } else {
          // Stable serialization for repeatable testing
          dataString = `--data '${stableStringify(ldo.schema.example)}'`;
        }
      }

      ldo.cfCurl = `curl -X ${method} "${uri}"`;

      // Note: local headers override completely, allowing clearing
      // global headers by setting "cfHeaders": {}
      let headers = ldo.headerSchema || globalHeaders || {};

      // Sort for predictable testing
      Object.entries(headers.example || {})
        .sort()
        .forEach(([header, value]) => {
          const titleCased = header.replace(/(?:^|-)[a-z]/g, match => {
            return match.toUpperCase();
          });
          ldo.cfCurl += ` \\\n     -H "${titleCased}: ${value}"`;
        });
      if (dataString) {
        ldo.cfCurl += ` \\\n     ${dataString}`;
      }
    });
  };
}

module.exports = {
  rollUpExamples,
  getCurlExampleCallback,
  _determineType
};
