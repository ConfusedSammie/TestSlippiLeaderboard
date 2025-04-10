import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import HomePage from './routes/home/HomePage';
import settings from '../../settings';
import GmRank from './routes/GmRank';

export default function App() {
  return (
    <BrowserRouter basename={settings.repoPath}>
      <Switch>
        <Route exact path="/HomePage" component={HomePage} />
        <Route path="/GmRank" component={GmRank} />
      </Switch>
    </BrowserRouter>
  );
}
