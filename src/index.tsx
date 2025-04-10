import React from 'react';
import { render } from 'react-dom';
import App from './components/App';
import './index.css';
const redirect = sessionStorage.redirect;
if (redirect) {
  sessionStorage.removeItem('redirect');
  window.history.replaceState(null, '', redirect);
}
render(<App />, document.getElementById('app'));
