import { ERPYAR_CANONICAL_BASE } from './content';

const SITE_NAME = 'ارپ یار';
const DEFAULT_TITLE = 'راهکارهای Frappe و ERPNext برای کسب وکارهای ایرانی';
const DEFAULT_DESCRIPTION =
  'ارپ یار بستری برای معرفی، فروش، استقرار و مدیریت اپلیکیشن های مبتنی بر Frappe در کنار زیرساخت Press است.';

function upsertMeta(attr, key, content) {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

function normalizePath(path) {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

export function applySeo(to) {
  const title = to.meta?.title ? `${to.meta.title} | ${SITE_NAME}` : `${DEFAULT_TITLE} | ${SITE_NAME}`;
  const description = to.meta?.description || DEFAULT_DESCRIPTION;
  const canonicalPath = normalizePath(to.meta?.canonicalPath || to.path);
  const canonicalUrl = `${ERPYAR_CANONICAL_BASE}${canonicalPath}`;

  document.title = title;

  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:locale', 'fa_IR');
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:url', canonicalUrl);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);

  upsertLink('canonical', canonicalUrl);
}

export function installSeo(router) {
  router.afterEach((to) => applySeo(to));
}
