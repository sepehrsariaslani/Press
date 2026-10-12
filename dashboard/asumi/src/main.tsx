import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/vazirmatn';
import { AsumiApp } from './App';
import { readMarketplaceApps } from './product/marketplace/MarketplaceShowcase';
import './styles/global.css';

document.documentElement.lang = 'fa';
document.documentElement.dir = 'rtl';

const root = document.getElementById('root');

if (!root) {
	throw new Error('Asumi root element was not found.');
}

createRoot(root).render(
	<StrictMode>
		<AsumiApp
			marketplaceApps={readMarketplaceApps(document.getElementById('asumi-marketplace-data'))}
			canManageMarketplacePrices={document.getElementById('asumi-marketplace-data')?.getAttribute('data-can-manage-prices') === 'true'}
		/>
	</StrictMode>,
);
