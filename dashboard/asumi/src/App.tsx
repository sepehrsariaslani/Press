import { ModuleDetailPage } from './product/ModuleDetailPage';
import { FinanceStory } from './product/finance/FinanceStory';
import { SalesStory } from './product/sales/SalesStory';
import { productModules } from './product/modules';
import { useModuleNavigation } from './product/useModuleNavigation';
import { StoryLanding } from './story/StoryLanding';

export function AsumiApp() {
	const { activeModuleId, openModule, returnToModules } = useModuleNavigation();
	const activeModuleIndex = productModules.findIndex(module => module.id === activeModuleId);
	const activeModule = productModules[activeModuleIndex];
	if (activeModule?.id === 'finance') {
		return <FinanceStory onOpenModule={openModule} onReturnToModules={returnToModules} />;
	}
	if (activeModule?.id === 'sales') {
		return <SalesStory onOpenModule={openModule} onReturnToModules={returnToModules} />;
	}
	if (activeModule) {
		return <ModuleDetailPage module={activeModule} index={activeModuleIndex} onOpenModule={openModule} onReturnToModules={returnToModules} />;
	}
	return <StoryLanding onOpenModule={openModule} />;
}
