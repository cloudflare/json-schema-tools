// this is passed to json-schema-example-loader
export default {
  title: 'Example API Documentation',

  // The baseUri is availabel for documentation to show, and
  // is used when generating examples.
  //
  // It typically ends in a / so that relative hrefs
  // in your schemas can be joined with it in accordance
  // with RFC 3986 relative URI reference resolution rules.
  //
  // By default, the generated app's src/client/introduction.js
  // component displays this baseUrl in your documentation.
  baseUri: 'https://api.example.com/example/v1/',

  // This is a JSON Schema which follows the behavior of "headerSchema"
  // defined in JSON Hyper-Schema draft-07
  // (a.k.a. draft-handrews-json-schema-hyperschema-01).
  // It treats the HTTP request headers as if they were a JSON object
  // instance, with lower-cased versions of the headers to remove
  // ambiguity in spelling.
  //
  // HTTP headers are case-insenstive per RFC 7230, although when
  // shown in examples these can be title-cased for convenience.
  //
  // These headers can be overridden (not extended) by specifying
  // "headerSchema" in individual Link Description Objects.
  // Specifying an empty object for "headerSchema" results in
  // no headers being described for the link.
  globalHeaderSchema: {
    required: ['content-type'],
    properties: {
      // Include other headers here, such as for auth
      'content-type': {
        type: 'string',
        enum: ['application/json'],
        example: 'application/json',
        description: 'Content type of the API request'
      }
    }
  }
};
