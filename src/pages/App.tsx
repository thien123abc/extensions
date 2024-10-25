import '../assets/css/index.scss';
import { Route, MemoryRouter as Router, Switch } from 'react-router-dom';
import MainScreen from './MainScreen';
import HistoryScreen from './HistoryScreen';
import { useEffect } from 'react';
import config from '../env.json';
function App() {
  useEffect(() => {
    handleBotAppCode();
  }, []);

  const handleBotAppCode = () => {
    const localBotAppCode = localStorage['bot_app_code'];
    const currentBotAppCode = config.bot_app_code;
    console.log('app code', localBotAppCode, currentBotAppCode);
    if (localBotAppCode !== currentBotAppCode) {
      localStorage['bot_app_code'] = currentBotAppCode;
      localStorage.removeItem('bot_token');
      localStorage.removeItem('conversations');
    }
  };

  return (
    <Router>
      <Switch>
        <Route exact path={'/'} component={MainScreen} />
        <Route path={'/history'} component={HistoryScreen} />
      </Switch>
    </Router>
  );
}

export default App;
