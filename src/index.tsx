import { render } from 'react-dom';

import App from './pages/App';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material';
import { store } from './store/store';
import { theme } from './theme';
import './assets/css/index.scss';

import api from './api/VsocApi';
import './prism-config';

(window as any).api = api;

const VsocApp = () => {
  return (
    <ThemeProvider theme={theme}>
      <Provider store={store}>
        <App />
      </Provider>
    </ThemeProvider>
  );
};

render(<VsocApp />, document.getElementById('root'));
