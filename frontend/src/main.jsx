import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/tokens.css';
import './styles/app.css';
import './styles/home.css';
import './styles/study.css';
import './styles/achievements.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
