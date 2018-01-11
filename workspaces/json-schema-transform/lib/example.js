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
  }
  return type;
}

/**
 * Roll up examples for use from the root schema, or the root of
 * schemas inside of Link Description Objects.  Schema objects
 * that already have an "example" field are left alone, although
 * the roll up will be run on subschemas.
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
 * as a post-walk callback, therefore it can safely assume that
 * subschemas of the subschema will have a rolled-up example
 * field as have already been visited.  Although this field may
 * be undefined if there was nothing to roll up.
 *
 * This is why the rollup is done in the subschema rather than
 * the parent.  All of the subschema's subschemas are guaranteed
 * to have been visited, while adjacent subschemas in the parent
 * may not have been.
 */
function rollupExamples(subschema, path, parent, parentPath) {
  // TODO: Should this code error out on undefined examples
  //       or leave them be?  What about undefined elements
  //       in array examples, or in property examples, most
  //       likely caused by minItems (and maybe minProperties
  //       once that is supported)?
  if (
    subschema === true ||
    subschema === false ||
    subschema.example !== undefined
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
      for (let i in alternatives) {
        if (alternatives[i].example !== undefined) {
          subschema.example = alternatives[i].example;
          break;
        }
      }
      break;
    case 'object':
      subschema.example = {};
      for (const prop in subschema.properties || {}) {
        if (
          !subschema.properties[prop].cfPrivate &&
          !subschema.properties[prop].cfOmitFromExample &&
          subschema.properties[prop].example !== undefined
        ) {
          subschema.example[prop] = subschema.properties[prop].example;
        }
      }
      // TODO: Something for "patternProperties" and "additionalProperties"?
      //       For now, objects using these keywords should provide examples
      //       at the parent object level.
      // TODO: Handle minProperties > 1, which is almost always used with either
      //       patternProperties or additionalProperties, but technially can be
      //       used with properties as well.
      break;

    case 'array':
      // Let the array stay empty if we don't have a defined example
      // element and we don't have minItems > 0.  But we will fill
      // in undefined up to minItems if necessary.
      subschema.example = [];
      if (Array.isArray(subschema.items)) {
        subschema.items.forEach((element, index) => {
          subschema.example[index] = subschema.items[index].example;
        });

        if (
          subschema.additionalItems &&
          subschema.additionalItems.example !== undefined
        ) {
          subschema.example.push(subschema.additionalItems.example);
        }
      } else if (subschema.items && subschema.items.example !== undefined) {
        subschema.example = [subschema.items.example];
      }

      // Ensure that we have at least minItems examples in the array,
      // even if those "examples" are undefined (see TODO above about
      // undefined examples).
      if (subschema.minItems && subschema.minItems > subschema.example.length) {
        let additionalExample;

        if (Array.isArray(subschema.items) && subschema.additionalItems) {
          additionalExample = subschema.additionalItems.example;
        } else if (subschema.items) {
          additionalExample = subschema.items.example;
        }

        for (let i = subschema.example.length; i < subschema.minItems; i++) {
          subschema.example.push(additionalExample);
        }
      }
      break;

    default:
      // The default value, if it exists, is the example of last resort.
      subschema.example = subschema.default;
  }
  // TODO: Do we need to handle an undefined example?
  //       json-schema-example-loader would set the example
  //       to 'unknown' under some circumstances.
}

module.exports = {
  rollupExamples,
  _determineType
};
