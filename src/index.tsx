import { render } from 'react-dom';

import App from './pages/App';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material';
import { store } from './store/store';
import { theme } from './theme';
import './assets/css/index.scss';

import api from './api/VsocApi';

import 'prismjs/themes/prism.css'; // Chọn theme Prism.js
import 'prismjs/components/prism-python.min.js'; //  hỗ trợ Python
import 'prismjs/components/prism-javascript.min.js'; //  hỗ trợ JavaScript
import 'prismjs/components/prism-css.min.js'; //  hỗ trợ CSS
import 'prismjs/components/prism-markup.min.js'; //  hỗ trợ HTML
import 'katex/dist/katex.min.css';

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
