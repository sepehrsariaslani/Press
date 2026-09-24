import { useEffect, useState } from 'react';

function resolveModuleId(moduleId: string) {
  const normalizedId = moduleId.toLowerCase();
  return normalizedId === 'marketing' ? 'growth' : normalizedId;
}

function readModuleId() {
  const moduleId = /^#module\/([a-z0-9-]+)$/i.exec(window.location.hash)?.[1];
  return moduleId ? resolveModuleId(moduleId) : null;
}

export function useModuleNavigation() {
  const [activeModuleId, setActiveModuleId] = useState(readModuleId);

  useEffect(() => {
    const syncRoute = () => setActiveModuleId(readModuleId());
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  function openModule(moduleId: string) {
    const resolvedModuleId = resolveModuleId(moduleId);
    window.history.pushState({ asumiModule: true }, '', `#module/${resolvedModuleId}`);
    setActiveModuleId(resolvedModuleId);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function returnToModules() {
    window.history.replaceState(null, '', '#modules');
    setActiveModuleId(null);
    window.requestAnimationFrame(() => {
      document.getElementById('modules')?.scrollIntoView?.({ block: 'start' });
    });
  }

  return { activeModuleId, openModule, returnToModules };
}
