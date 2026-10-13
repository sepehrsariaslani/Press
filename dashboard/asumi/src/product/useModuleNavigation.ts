import { useEffect, useState } from 'react';
import { buildServiceRequestHref, type ServiceRequestKind } from './serviceRequestRoute';

function resolveModuleId(moduleId: string) {
  const normalizedId = moduleId.toLowerCase();
  return normalizedId === 'marketing' ? 'growth' : normalizedId;
}

function readModuleId() {
  const moduleId = /^#module\/([a-z0-9-]+)$/i.exec(window.location.hash)?.[1];
  return moduleId ? resolveModuleId(moduleId) : null;
}

function scrollToCurrentSection() {
  const id = window.location.hash.slice(1);
  if (!/^(chaos|order|connections|clarity|direction|calm|roles|modules|industries)$/.test(id)) return;
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }));
}

export function useModuleNavigation() {
  const [activeModuleId, setActiveModuleId] = useState(readModuleId);
  const [showPricing, setShowPricing] = useState(() => window.location.hash === '#pricing');
  const [showWebsiteDesign, setShowWebsiteDesign] = useState(() => window.location.hash === '#website-design');

  useEffect(() => {
    const syncRoute = () => {
      setActiveModuleId(readModuleId());
      setShowPricing(window.location.hash === '#pricing');
      setShowWebsiteDesign(window.location.hash === '#website-design');
      scrollToCurrentSection();
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    syncRoute();
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  function openModule(moduleId: string) {
    const resolvedModuleId = resolveModuleId(moduleId);
    window.history.pushState({ asumiModule: true }, '', `#module/${resolvedModuleId}`);
    setActiveModuleId(resolvedModuleId);
    setShowPricing(false);
    setShowWebsiteDesign(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function openPricing() {
    window.history.pushState({ asumiPricing: true }, '', '#pricing');
    setActiveModuleId(null);
    setShowPricing(true);
    setShowWebsiteDesign(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function openOrderCenter(moduleIds: string[], context: string, service: ServiceRequestKind = 'module_pricing', addonIds: string[] = []) {
    window.location.assign(buildServiceRequestHref(service, context, moduleIds, addonIds));
  }

  function returnToModules() {
    const rootPath = window.location.pathname === '/' ? '' : '/';
    window.history.replaceState(null, '', `${rootPath}#modules`);
    setActiveModuleId(null);
    setShowPricing(false);
    setShowWebsiteDesign(false);
    window.requestAnimationFrame(() => {
      document.getElementById('modules')?.scrollIntoView?.({ block: 'start' });
    });
  }

  return { activeModuleId, openModule, openPricing, openOrderCenter, returnToModules, showPricing, showWebsiteDesign };
}
