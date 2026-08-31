import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AsumiApp } from './App';
import './styles/global.css';

document.documentElement.lang = 'fa';
document.documentElement.dir = 'rtl';

const root = document.getElementById('root');

if (!root) {
	throw new Error('Asumi root element was not found.');
}

createRoot(root).render(
	<StrictMode>
		<AsumiApp />
	</StrictMode>,
);
