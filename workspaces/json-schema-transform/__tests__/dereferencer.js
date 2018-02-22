const fs = require('fs');
const path = require('path');
const transform = require('../index.js');

describe('Dereferencer system test', () => {
  beforeAll(() => {
    this.fixtureDir = path.join(__dirname, 'fixtures');
    this.refDir = path.join(this.fixtureDir, 'refs');
    this.schemaLocalPath = path.join(this.fixtureDir, 'refs.json');
    this.schemaUri = 'file://' + this.schemaLocalPath;

    this.expectedSchema = JSON.parse(
      fs.readFileSync(path.join(this.fixtureDir, 'refs-resolved.json'))
    );

    // Now set up the expected dependencies data.
    this.expectedDependencies = [
      'json',
      'yaml',
      'json5',
      'js',
      'noext',
      'withext.json'
    ].map(e => {
      let suffix = e === 'noext' || e === 'withext.json' ? '' : `.${e}`;

      return {
        uri: 'file://' + `${this.refDir}/${e}`,
        localPath: `${this.refDir}/${e}${suffix}`
      };
    });

    // The initial file itself is also included
    this.expectedDependencies.push({
      uri: this.schemaUri,
      localPath: this.schemaLocalPath
    });

    // Comparison function for sorting dependency arrays
    this.dependenciesCmp = (a, b) => {
      if (a.uri < b.uri) {
        return -1;
      } else if (a.uri > b.uri) {
        return 1;
      }
      return 0;
    };
    this.expectedDependencies.sort(this.dependenciesCmp);
  });

  test('AutoExtensionDereferencer', async () => {
    let aed = new transform.AutoExtensionDereferencer(this.schemaUri);
    let dereferenced = await aed.dereference();

    expect(dereferenced).toEqual(this.expectedSchema);

    let dependencies = aed.getDependencies();
    dependencies.sort(this.dependenciesCmp);

    expect(dependencies).toEqual(this.expectedDependencies);
  });

  test('Require file:// URI', () => {
    expect(() => {
      new transform.AutoExtensionDereferencer(this.schemaLocalPath);
    }).toThrow();
  });

  test('No relevant file causes exception', async () => {
    let aed = new transform.AutoExtensionDereferencer(
      'file://' + path.join(this.fixtureDir, 'refs-dangling.json')
    );
    try {
      await aed.dereference();
    } catch (e) {
      expect(e.code).toEqual('ENOENT');
    }
  });
});
