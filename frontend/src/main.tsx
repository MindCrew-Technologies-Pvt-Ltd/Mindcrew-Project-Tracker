// Catch all errors including module-level crashes
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = `<div style="padding:32px;font-family:monospace;background:#fff;color:#d32f2f">
      <h2>Fatal JS Error</h2>
      <pre style="background:#f5f5f5;padding:16px;overflow:auto">${event.message}\n\n${event.error?.stack || ''}</pre>
    </div>`;
  }
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';
import { store } from './store';
import theme from './theme';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
