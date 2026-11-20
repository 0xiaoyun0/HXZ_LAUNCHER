import './compat';
import '../../../packages/ui/file-input.css';
import React from 'react';import {createRoot} from 'react-dom/client';import App from './launcher/App';import './launcher/desktop.css';
createRoot(document.getElementById('root')!).render(<App/>);
