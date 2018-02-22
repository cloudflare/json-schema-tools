const fs = require('fs');
const path = require('path');
const RefParser = require('json-schema-ref-parser');

/**
 * Search an ordered list of possible extensions and
 * return the first one matching an existing file, or
 * an empty string if none match.
 *
 * Currently assumes file:// URIs.
 */
function _findExtension(url) {
  // Include '' first so that we notice if there is an
  // existing file and don't look further.
  const extensions = ['', '.json', '.yaml', '.json5', '.js'];

  for (const ext of extensions) {
    const localPath = url.slice('file://'.length) + ext;
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      return ext;
    }
  }
  return '';
}

/**
 * Plugin for json-schema-ref-parser that uses _findExtension()
 * to see if we recognize a format, and then update the ref-parser's
 * data structure accordingly and returns a boolean according to
 * its plug-in interface specification.
 */
function _autoExtensionChecker(file) {
  if (/^file:\/\//.test(file.url) && !file.extension) {
    const extension = _findExtension(file.url);
    if (extension) {
      file.extension = extension;
      file.url = file.url.slice('file://'.length) + extension;
      return true;
    }
  }
  return false;
}

/**
 * Reads the file, and if neither YAML nor plain JSON
 * parses the contents and writes them back out as
 * JSON so that RefParser will understand it.
 */
function _autoExtensionReader(file, callback) {
  let contents;
  if (file.extension === '.js') {
    // TODO: Somehow this doesn't really work if we re-stringify
    //       the data, even though the plug-in specification requests
    //       the most raw form and re-stringifying is what works for json5.
    contents = require(file.url);
    return contents;
  } else {
    contents = fs.readFileSync(file.url);
    if (file.extension === '.json5') {
      const JSON5 = require('json5');
      return JSON.stringify(JSON5.parse(contents));
    }
  }
  return contents;
}

/**
 * Resolves all $refs, first checking a series of possible
 * format-indicating file extensions (.json, .yaml, .json5, .js)
 * if the URI does not immediately resolve to a file.
 *
 * This encapsulates the usage of json-schema-ref-parser because
 * none of its current circular reference strategies are ideal.
 * "ignore" is close, but does not detect the ideal minimal set
 * of circular references to retain.
 *
 * Additionally, $ref behavior may change in draft-08 and it's not
 * clear whether or how json-schema-ref-parser will reflect that.
 *
 * Additionally, since the $ref URI and the actual resolved file
 * may have different names, this interface supports that directly.
 *
 * In the future this may support circular references in a manner
 * similar to json-schema-ref-parser's "ignore" option, but with
 * more intelligence around which reference is designated as circular.
 */
class AutoExtensionDereferencer {
  constructor(schema) {
    if (!schema.startsWith('file://')) {
      throw new Error("Currenty, only 'file://' URIs are supported.");
    }
    this._parser = new RefParser();
    this._schema = schema;
  }

  /**
   * Returns a promise, to which the dereferenced data structure will
   * be passed.
   */
  dereference() {
    return this._parser.dereference(this._schema, {
      resolve: {
        http: {
          order: 1,
          canRead: _autoExtensionChecker,
          read: _autoExtensionReader
        }
      }
    });
  }

  /**
   * Returns a list of objects representing resolved references,
   * each of which has two properties:
   *
   * uri:
   *    The resolved URI, which may be file:// scheme rather than what
   *    is present in the schema's "id" or "$id" if the schema was supplied
   *    as a file URI.
   * localPath:
   *    The absolute local filesystem path, if relevant.  Otherwise undefined.
   *
   * In the case of auto-extension resolution the extension will be present
   * on the local file path, but not the URI.
   *
   * Note that this only produces a useful value after dereferencing.
   * Currently, only file:// URIs are supported.
   */
  getDependencies() {
    return this._parser.$refs.paths().map(p => {
      // For the local path strip off the file:// URI scheme
      return {
        uri: p,
        localPath: p.slice('file://'.length) + _findExtension(p)
      };
    });
  }
}

module.exports = {
  AutoExtensionDereferencer
};
