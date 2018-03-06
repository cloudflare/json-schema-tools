/* eslint max-len: 0 */
/* eslint react/jsx-indent: 0 */
/* eslint react/no-unescaped-entities: 0 */

import React from 'react';
import Component from 'react-pure-render/component';
import config from '../../config';

/* This is a placeholder for introductory content.  It is connected
 * to the table of contents by the getting-started.json file in
 * the root directory of the generated app.  You will want to
 * customize or replace this!
 */
class Introduction extends Component {
  render() {
    return (
      <div>
        <article className="section api-section">
          <p>
            <small>
              Last modified: {new Date(LAST_MODIFIED).toDateString()}
            </small>
          </p>
          <h2>Getting started</h2>

          <p>Lorem ipsum...</p>
        </article>
        <article className="section api-section">
          <a className="anchor2" id="getting-started-endpoints">
            getting-started-endpoints
          </a>
          <h2>Endpoints</h2>

          <p>Lorem ipsum...</p>

          <p>The base URL for all endpoints in this API is:</p>
          <p className="CodeMirror cm-s-default">{config.baseUri}</p>
        </article>

        <article className="section api-section">
          <a className="anchor2" id="getting-started-requests">
            getting-started-requests
          </a>
          <h2>Requests</h2>
          <p>Lorem ipsum...</p>
        </article>

        <article className="section api-section">
          <a className="anchor2" id="getting-started-responses">
            getting-started-responses
          </a>
          <h2>Responses</h2>
          <p>Lorem ipsum...</p>
        </article>
      </div>
    );
  }
}

module.exports = Introduction;
