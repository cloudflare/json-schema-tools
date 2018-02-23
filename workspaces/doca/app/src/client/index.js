import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Main from './main';
import store from './store';

const rootEl = document.getElementById('app-root');
ReactDOM.render(<Provider store={store}><Main /></Provider>, rootEl);
