import { connect } from 'react-redux';
import { App } from 'doca-bootstrap-theme';
import Introduction from './introduction';
import config from '../../config';

// this dynamically imports css, less and sass from the "THEME/styles"
try {
  const reqCSS = require.context('doca-bootstrap-theme/styles', true, /\.css$/ig);
  reqCSS.keys().forEach(reqCSS);
  const reqLESS = require.context('doca-bootstrap-theme/styles', true, /\.less$/ig);
  reqLESS.keys().forEach(reqLESS);
  const reqSASS = require.context('doca-bootstrap-theme/styles', true, /\.scss$/ig);
  reqSASS.keys().forEach(reqSASS);
} catch (e) {
  // no theme styles were found
}

const mapStateToProps = state => ({
  schemas: state.schemas,
  config,
  introduction: Introduction,
});

const Main = connect(
  mapStateToProps,
)(App);

export default Main;
