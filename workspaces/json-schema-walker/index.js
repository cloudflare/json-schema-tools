const schemaWalk = require('./lib/schemaWalk');

module.exports = {
  getSubschema: schemaWalk.getSubschema,
  schemaWalk: schemaWalk.schemaWalk,
  subschemaWalk: schemaWalk.subschemaWalk,
  getVocabulary: schemaWalk.getVocabulary,
  vocabularies: schemaWalk.vocabularies
};
