const path = require('path');
const transform = require('@cloudflare/json-schema-transform');

module.exports = function(source) {
  this.cacheable && this.cacheable();

  let callback = this.async();
  console.error(this.resourcePath);

  // Using a file:// URI avoids problems with the ref parser
  // misunderstanding relative paths.
  let dereferencer = new transform.AutoExtensionDereferencer(
    'file://' + this.resourcePath,
    JSON.parse(source)
  );

  dereferencer
    .dereference()
    .then(handleResolveSuccess.bind(this))
    .catch(callback);

  function handleResolveSuccess(schema) {
    this.value = [schema];
    dereferencer.getDependencies().forEach(d => {
      this.addDependency(d.localPath);
    });
    callback(null, `module.exports = ${JSON.stringify(schema, null, 2)};`);
  }
};
