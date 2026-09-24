import { useEffect, useState } from 'react';

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
  const [showAdmin, setShowAdmin] = useState(() => window.location.hash === '#admin');
  const [showPortal, setShowPortal] = useState(() => window.location.hash === '#portal' || (window.location.pathname !== '/' && window.location.hash !== '#admin'));

  useEffect(() => {
    const syncRoute = () => {
      setActiveModuleId(readModuleId());
      setShowPricing(window.location.hash === '#pricing');
      setShowAdmin(window.location.hash === '#admin');
      setShowPortal(window.location.hash === '#portal' || (window.location.pathname !== '/' && window.location.hash !== '#admin'));
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
    setShowPortal(false);
    setShowAdmin(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function openPricing() {
    window.history.pushState({ asumiPricing: true }, '', '#pricing');
    setActiveModuleId(null);
    setShowPricing(true);
    setShowPortal(false);
    setShowAdmin(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function openPortalPurchase(moduleIds: string[], context: string) {
    try { window.localStorage.setItem('asumi-portal-intent', JSON.stringify({ moduleIds, context })); } catch { /* The portal request can be completed manually. */ }
    try { window.localStorage.removeItem('asumi-pricing-from-portal'); } catch { /* Route navigation does not depend on storage. */ }
    window.history.pushState({ asumiPortal: true }, '', '#portal');
    setActiveModuleId(null);
    setShowPricing(false);
    setShowPortal(true);
    setShowAdmin(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function openPortalAdmin() {
    window.history.pushState({ asumiAdmin: true }, '', '#admin');
    setActiveModuleId(null);
    setShowPricing(false);
    setShowPortal(false);
    setShowAdmin(true);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function openCustomerPortal() {
    window.history.pushState({ asumiPortal: true }, '', '#portal');
    setActiveModuleId(null);
    setShowPricing(false);
    setShowPortal(true);
    setShowAdmin(false);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function returnToModules() {
    const rootPath = window.location.pathname === '/' ? '' : '/';
    try {
      if (window.localStorage.getItem('asumi-pricing-from-portal') === '1') {
        window.localStorage.removeItem('asumi-pricing-from-portal');
        window.history.replaceState(null, '', `${rootPath}#portal`);
        setActiveModuleId(null);
        setShowPricing(false);
        setShowPortal(true);
        setShowAdmin(false);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        return;
      }
    } catch { /* Fall through to the public module overview. */ }
    window.history.replaceState(null, '', `${rootPath}#modules`);
    setActiveModuleId(null);
    setShowPricing(false);
    setShowPortal(false);
    setShowAdmin(false);
    window.requestAnimationFrame(() => {
      document.getElementById('modules')?.scrollIntoView?.({ block: 'start' });
    });
  }

  return { activeModuleId, openModule, openPricing, openPortalPurchase, openPortalAdmin, openCustomerPortal, returnToModules, showAdmin, showPortal, showPricing };
}
