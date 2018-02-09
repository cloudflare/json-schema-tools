const loaderUtils = require('loader-utils');
const validateOptions = require('schema-utils');
const transform = require('@cloudflare/json-schema-transform');

module.exports = function(source) {
  this.cacheable && this.cacheable();

  const optionsSchema = {
    type: 'object',
    properties: {
      baseUri: {
        type: 'string',
        format: 'uri',
        description:
          'The URI used as the base for resolving example URIs from link hrefs'
      },
      globalRequestHeaders: {
        type: 'object',
        description:
          'JSON Schemas for HTTP request headers to use with examples unless overridden by cfRequestHeaders'
      }
    }
  };

  const options = loaderUtils.getOptions(this);
  options &&
    validateOptions(optionsSchema, options, 'API Documentation Loader');

  let schema = eval(source);
  transform.processApiDocSchema(schema, options);
  this.value = [schema];
  return `module.exports = ${JSON.stringify(schema, null, 2)};`;
};
