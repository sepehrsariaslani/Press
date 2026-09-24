import { ModuleDetailPage } from './product/ModuleDetailPage';
import { FinanceStory } from './product/finance/FinanceStory';
import { ModulePricingPage } from './product/pricing/ModulePricingPage';
import { CustomerPortal } from './customer-portal/CustomerPortal';
import { PortalAdminPage } from './customer-portal/PortalAdminPage';
import { ProcurementStory } from './product/procurement/ProcurementStory';
import { SalesStory } from './product/sales/SalesStory';
import { productModules } from './product/modules';
import { useModuleNavigation } from './product/useModuleNavigation';
import { StoryLanding } from './story/StoryLanding';

export function AsumiApp() {
  const { activeModuleId, openModule, openPricing, openPortalPurchase, openPortalAdmin, openCustomerPortal, returnToModules, showAdmin, showPortal, showPricing } = useModuleNavigation();
  if (showAdmin) {
    return <PortalAdminPage onOpenCustomerPortal={openCustomerPortal} onReturnToModules={returnToModules} />;
  }
  if (showPortal) {
    return <CustomerPortal onOpenAdmin={openPortalAdmin} onReturnToModules={returnToModules} />;
  }
	if (showPricing) {
		return <ModulePricingPage onOpenModule={openModule} onReturnToModules={returnToModules} onRequestPurchase={openPortalPurchase} />;
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
	return <StoryLanding onOpenModule={openModule} onOpenPricing={openPricing} />;
}
