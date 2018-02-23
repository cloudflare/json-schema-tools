import StaticSiteGeneratorPlugin from 'static-site-generator-webpack-plugin';
import webpack from 'webpack';
import config from './config.prod.babel';

config.plugins.unshift(
  new webpack.DefinePlugin({
    IS_JAVASCRIPT: false,
    LAST_MODIFIED: Date.now(),
  })
);

config.plugins.unshift(
  new StaticSiteGeneratorPlugin('static', ['/index.html'], { skipJS: true })
);

export default config;
