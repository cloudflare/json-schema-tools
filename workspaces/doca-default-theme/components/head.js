const React = require('react');

const Head = ({ cssBundle, title }) => (
  <head>
    <meta charSet="utf-8" />
    <title>{title}</title>
    <meta
      name="viewport"
      content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    {cssBundle && <link href={cssBundle} rel="stylesheet" />}
  </head>
);

Head.propTypes = {
  cssBundle: React.PropTypes.string,
  title: React.PropTypes.string
};

Head.displayName = 'Head';
module.exports = Head;
