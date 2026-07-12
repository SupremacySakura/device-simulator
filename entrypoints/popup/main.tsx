import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../app.css';
import { ToastProvider } from '../../components/common/ToastProvider';
import { App } from './App';

ReactDOM.createRoot(document.querySelector('#root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
