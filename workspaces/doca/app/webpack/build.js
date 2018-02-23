/* eslint react/no-danger: 0 */

import React, { PropTypes } from 'react';
import ReactDOMServer from 'react-dom/server';
import { Provider } from 'react-redux';
import { Head } from 'doca-bootstrap-theme';
import Main from '../src/client/main';
import store from '../src/client/store';
import config from '../config';

const Page = ({ body, hash, skipJS, skipCSS }) => (
  <html lang="en-US">
    <Head title={config.title} cssBundle={skipCSS ? '' : `app-${hash}.css`} />
    <body>
      <div id="app-root" dangerouslySetInnerHTML={{ __html: body }} />
      {!skipJS && <script src={`app-${hash}.js`} type="text/javascript" />}
    </body>
  </html>
);

Page.propTypes = {
  hash: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  skipJS: PropTypes.bool.isRequired,
  skipCSS: PropTypes.bool.isRequired
};

export default (locals, callback) => {
  const skipCSS = !Object.keys(locals.webpackStats.compilation.assets).some(
    val => val === `app-${locals.webpackStats.hash}.css`
  );
  const body = ReactDOMServer.renderToString(
    <Provider store={store}>
      <Main />
    </Provider>
  );
  callback(
    null,
    `<!DOCTYPE html>${ReactDOMServer.renderToStaticMarkup(
      <Page
        body={body}
        hash={locals.webpackStats.hash}
        skipJS={locals.skipJS}
        skipCSS={skipCSS}
      />
    )}`
  );
};
