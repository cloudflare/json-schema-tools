const React = require('react');
const Component = require('react-pure-render/component');
const PropTypes = require('prop-types');
const ImmutablePropTypes = require('react-immutable-proptypes');

class App extends Component {
  static propTypes = {
    schemas: ImmutablePropTypes.list.isRequired,
    config: PropTypes.object,
    introduction: PropTypes.func
  };

  renderIntro = () => {
    var Introduction = this.props.introduction;
    return <Introduction />;
  };

  render() {
    const { schemas, config } = this.props;

    return (
      <div>
        {this.renderIntro()}
        <h2>Schemas</h2>
        {schemas
          .filter(schema => !schema.get('cfHidden'))
          .valueSeq()
          .map(schema => (
            <div key={schema.get('id')}>
              <hr />
              <h3>{schema.get('title')}</h3>
              <h4>{schema.get('id')}</h4>
              <pre>{JSON.stringify(schema, null, 2)}</pre>
            </div>
          ))}
      </div>
    );
  }
}

module.exports = App;
