const React = require('react');
const Component = require('react-pure-render/component');
const ImmutablePropTypes = require('react-immutable-proptypes');

class App extends Component {

  static propTypes = {
    schemas: ImmutablePropTypes.list.isRequired,
    config: React.PropTypes.object,
    introduction: React.PropTypes.function,
  };

  renderIntro = () => {
    var Introduction = this.props.introduction;
    return <Introduction />;
  }

  render() {
    const { schemas, config } = this.props;

    return (
      <div>
        {this.renderIntro()}
        {schemas
          .filter(schema => !schema.get('cfHidden'))
          .valueSeq()
          .map(schema => <pre>{JSON.stringify(schema, null, 2)}</pre>)
        }
      </div>
    );
  }
}

module.exports = App;
