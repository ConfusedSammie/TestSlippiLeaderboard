import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import HomePage from './routes/home/HomePage';
import GmRank from './routes/GmRank';
import settings from '../../settings';
import PredictionJson from './routes/PredictionJson';

export default function App() {
  return (
    <Router basename={settings.repoPath}>
      <Switch>
        <Route exact path="/" component={HomePage} />
        <Route path="/HomePage" component={HomePage} />
        <Route path="/GmRank" component={GmRank} />
        <Route path="/data/prediction.json" component={PredictionJson} />
        <Redirect to="/" />
      </Switch>
    </Router>
  );
}
