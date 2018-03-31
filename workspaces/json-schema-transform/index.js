var mergeCfRecurse = require('./lib/mergeCfRecurse');
var allOf = require('./lib/allOf');
var example = require('./lib/example');
var apiDoc = require('./lib/apiDoc');
var dereferencer = require('./lib/dereferencer');

module.exports = {
  mergeCfRecurse: mergeCfRecurse.mergeCfRecurse,
  makeCfRecurseWalker: mergeCfRecurse.makeCfRecurseWalker,
  pruneDefinitions: mergeCfRecurse.pruneDefinitions,
  removeLinksAndDefs: mergeCfRecurse.removeLinksAndDefs,
  getCollapseAllOfCallback: allOf.getCollapseAllOfCallback,
  collapseSchemas: allOf.collapseSchemas,
  rollUpExamples: example.rollUpExamples,
  getCurlExampleCallback: example.getCurlExampleCallback,
  processApiDocSchema: apiDoc.processApiDocSchema,
  AutoExtensionDereferencer: dereferencer.AutoExtensionDereferencer,
  vocabularies: allOf.vocabularies
};
