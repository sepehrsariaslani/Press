import { ModuleDetailPage } from './product/ModuleDetailPage';
import { FinanceStory } from './product/finance/FinanceStory';
import { ModulePricingPage } from './product/pricing/ModulePricingPage';
import { WebsiteDesignPricingPage } from './product/web-design/WebsiteDesignPricingPage';
import { ProcurementStory } from './product/procurement/ProcurementStory';
import { SalesStory } from './product/sales/SalesStory';
import { productModules } from './product/modules';
import { useModuleNavigation } from './product/useModuleNavigation';
import { StoryLanding } from './story/StoryLanding';
import type { MarketplaceApp } from './product/marketplace/MarketplaceShowcase';

type AsumiAppProps = {
	marketplaceApps?: MarketplaceApp[];
	canManageMarketplacePrices?: boolean;
	isAuthenticated?: boolean;
};

export function AsumiApp({ marketplaceApps = [], canManageMarketplacePrices = false, isAuthenticated = false }: AsumiAppProps = {}) {
	const { activeModuleId, openModule, openPricing, openOrderCenter, returnToModules, showPricing, showWebsiteDesign } = useModuleNavigation();
	if (showWebsiteDesign) {
		return <WebsiteDesignPricingPage onReturnToModules={returnToModules} onRequestQuote={context => openOrderCenter([], context, 'website_design')} />;
	}
	if (showPricing) {
		return <ModulePricingPage onOpenModule={openModule} onReturnToModules={returnToModules} onRequestPurchase={openOrderCenter} />;
	}
	const activeModuleIndex = productModules.findIndex(module => module.id === activeModuleId);
	const activeModule = productModules[activeModuleIndex];
	if (activeModule?.id === 'finance') {
		return <FinanceStory onOpenModule={openModule} onReturnToModules={returnToModules} onOpenPricing={openPricing} />;
	}
	if (activeModule?.id === 'sales') {
		return <SalesStory onOpenModule={openModule} onReturnToModules={returnToModules} onOpenPricing={openPricing} />;
	}
	if (activeModule?.id === 'procurement') {
		return <ProcurementStory onOpenModule={openModule} onReturnToModules={returnToModules} onOpenPricing={openPricing} />;
	}
	if (activeModule) {
		return <ModuleDetailPage module={activeModule} index={activeModuleIndex} onOpenModule={openModule} onReturnToModules={returnToModules} onOpenPricing={openPricing} />;
	}
	return <StoryLanding onOpenModule={openModule} onOpenPricing={openPricing} marketplaceApps={marketplaceApps} canManageMarketplacePrices={canManageMarketplacePrices} isAuthenticated={isAuthenticated} />;
}
