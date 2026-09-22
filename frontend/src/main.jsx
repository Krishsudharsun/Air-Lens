import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { RouteProvider } from './context/RouteContext.jsx';
import './theme/theme.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouteProvider>
        <App />
      </RouteProvider>
    </BrowserRouter>
  </React.StrictMode>
);
