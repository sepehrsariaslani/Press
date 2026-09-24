import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AsumiApp } from './App';
import { productModuleDetails } from './product/moduleDetails';
import { productModules } from './product/modules';

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', window.location.pathname);
});

test('renders the evidence board, six Persian chapters, fifteen product modules and the entry route without 3D media', () => {
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('img', { name: /آسومی؛ ERP یکپارچه/ })).toBeInTheDocument();
  expect(container.querySelectorAll('.evidence-card')).toHaveLength(8);
  expect(container.querySelector('canvas, img, video')).not.toBeInTheDocument();
  expect(container.querySelectorAll('.story-chapter')).toHaveLength(6);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'آسومی را ببین' })).toHaveAttribute('href', '/hesab');
  expect(screen.getByRole('link', { name: '1. کشف' })).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('region', { name: /هر بخش از کسب‌وکارت/ })).toBeInTheDocument();
  expect(container.querySelectorAll('.module-card')).toHaveLength(15);
  expect(container.querySelector('.module-card[href="#module/sales"]')).toBeInTheDocument();
  expect(container.querySelector('.module-card[href="#module/crm"]')).toBeInTheDocument();
  expect(container.querySelector('.module-card[href="#module/business"]')).toBeInTheDocument();
});

test('provides a detail route, at least one document and valid related links for every module', () => {
  const moduleIds = productModules.map(module => module.id);
  expect(moduleIds).toHaveLength(15);
  expect(moduleIds.at(-1)).toBe('business');
  expect(Object.keys(productModuleDetails).sort()).toEqual([...moduleIds].sort());
  for (const details of Object.values(productModuleDetails)) {
    expect(details.entryPath.startsWith('/')).toBe(true);
    expect(details.records.length).toBeGreaterThan(0);
    expect(details.relatedIds.every(id => moduleIds.includes(id))).toBe(true);
  }
});

test('opens the marketing detail page with real work areas, documents, scope and a direct app entry', async () => {
  render(<AsumiApp />);
  fireEvent.click(screen.getByRole('link', { name: /بازاریابی و رشد/ }));
  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'بازاریابی و رشد' })).toBeInTheDocument());
  expect(screen.getByText('Marketing Campaign Brief')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /ورود به مرکز بازاریابی/ })).toHaveAttribute('href', '/hesab/modules/marketing');
  expect(screen.getByRole('heading', { level: 2, name: 'مرز این ماژول کجاست؟' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /برنامه‌ریزی کسب‌وکار/ })).toHaveAttribute('href', '#module/business');
});

test('opens the separate business module and returns to the module directory', async () => {
  render(<AsumiApp />);
  fireEvent.click(screen.getByRole('link', { name: /برنامه‌ریزی کسب‌وکار/ }));
  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'برنامه‌ریزی کسب‌وکار' })).toBeInTheDocument());
  expect(screen.getByText('Business Planning Scenario')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /ورود به نمای کلی کسب‌وکار/ })).toHaveAttribute('href', '/hesab/business/overview');
  fireEvent.click(screen.getByRole('button', { name: /برگشت به همه‌ی ۱۵ ماژول/ }));
  await waitFor(() => expect(screen.getByRole('navigation', { name: '۱۵ ماژول آسومی' })).toBeInTheDocument());
});

test('supports opening a module directly from its deep link', () => {
  window.history.replaceState(null, '', '#module/crm');
  render(<AsumiApp />);
  expect(screen.getByRole('heading', { level: 1, name: 'مدیریت ارتباط با مشتری' })).toBeInTheDocument();
  expect(screen.getByText('CRM Deal')).toBeInTheDocument();
});

test('opens finance as a separate Persian financial story with a direct route into the real center', () => {
  window.history.replaceState(null, '', '#module/finance');
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('heading', { level: 1, name: 'این پول کجا رفت؟' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'نمای تصویری: کشف' })).toBeInTheDocument();
  expect(container.querySelector('.finance-story')).toHaveAttribute('data-chapter', '0');
  expect(screen.getByText('روایت نمایشی · مبلغ‌ها نمونه‌اند')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /ورود به مرکز مالی/ })[0]).toHaveAttribute('href', '/hesab/modules/finance');
});

test('opens the sales story in the homepage case-board style with a request-to-order journey', () => {
  window.history.replaceState(null, '', '#module/sales');
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('heading', { level: 1, name: 'یک درخواست تازه.' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /پرونده‌ی فروش آسومی/ })).toBeInTheDocument();
  expect(container.querySelector('.sales-story')).toHaveAttribute('data-chapter', '0');
  expect(container.querySelector('.sales-story')).toHaveAttribute('aria-labelledby', 'sales-request-title');
  expect(container.querySelectorAll('.sales-chapter-nav a')).toHaveLength(6);
  expect(container.querySelector('[data-sales-item="request"]')).toHaveTextContent('۱۲۰ عدد');
  expect(container.querySelector('[data-sales-item="request"]')).toHaveTextContent('از کد A قیمت می‌خواستم');
  expect(container.querySelector('[data-sales-item="quote"]')).toHaveTextContent('پیش‌فاکتور');
  expect(screen.getAllByRole('link', { name: /ورود به مرکز فروش/ })[0]).toHaveAttribute('href', '/hesab/modules/sales');
  expect(container.querySelector('.finance-story')).not.toBeInTheDocument();
});

test('shows the accepted quotation, four order obligations and clear illustrative-data disclosure', () => {
  window.history.replaceState(null, '', '#module/sales');
  const { container } = render(<AsumiApp />);
  expect(container.querySelector('[data-quote-total]')).toHaveTextContent('۲۷۳٬۶۰۰٬۰۰۰ تومان');
  expect(container.querySelector('[data-quote-sent]')).toHaveTextContent('پیشنهاد ارسال شد');
  expect(container.querySelector('[data-accepted-stamp]')).toHaveTextContent('تأیید شد');
  expect(container.querySelector('[data-order-number]')).toHaveTextContent('SO-1405-00291');
  expect(container.querySelector('[data-obligation="inventory"]')).toHaveTextContent('۱۲۰ عدد آماده');
  expect(container.querySelector('[data-obligation="delivery"]')).toHaveTextContent('پنج‌شنبه · ۱۰:۳۰');
  expect(container.querySelector('[data-obligation="shipment"]')).toHaveTextContent('آماده‌ی ثبت');
  expect(container.querySelector('[data-obligation="finance"]')).toHaveTextContent('۴۰٪ پیش‌پرداخت');
  expect(container.querySelectorAll('[data-sales-thread]')).toHaveLength(5);
  expect(container.querySelector('.sales-handoff-note')).toHaveTextContent('اعداد و وضعیت‌ها، اطلاعات زنده‌ی شرکت شما نیستند');
  expect(screen.getByRole('link', { name: /بازکردن قیف CRM/ })).toHaveAttribute('href', '/hesab/crm/pipeline');
  expect(screen.getAllByRole('link', { name: /ورود به مرکز فروش/ })[0]).toHaveAttribute('href', '/hesab/modules/sales');
});

test('moves the flashlight with the pointer while keeping scroll and links available', async () => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 0, left: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON: () => ({}),
  });
  const { container } = render(<AsumiApp />);
  fireEvent(window, new MouseEvent('pointermove', { clientX: 630, clientY: 350 }));
  await waitFor(() => expect(Number(container.querySelector('circle[data-flashlight]')?.getAttribute('cx'))).toBeGreaterThan(600));
  const touch = new MouseEvent('pointermove', { clientX: 950, clientY: 700 });
  Object.defineProperty(touch, 'pointerType', { value: 'touch' });
  fireEvent(window, touch);
  await waitFor(() => expect(Number(container.querySelector('circle[data-flashlight]')?.getAttribute('cx'))).toBeLessThan(240));
  expect(screen.getByRole('link', { name: '2. نظم' })).toHaveAttribute('href', '#order');
  expect(container.querySelector('.story-header .login-link')).toHaveAttribute('href', '/hesab');
});

test('reduced motion reveals all documents without requiring the visitor to aim a flashlight', async () => {
  const { container } = render(<AsumiApp />);
  const control = screen.getByRole('button', { name: 'کاهش حرکت‌های صحنه' });
  fireEvent.click(control);
  expect(control).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(container.querySelector('[data-mask-ambient]')).toHaveAttribute('opacity', '1.000'));
  expect(screen.getByTestId('case-board')).toHaveAttribute('data-flashlight', 'false');
  fireEvent.click(control);
  expect(screen.getByRole('main')).toHaveAttribute('data-reduced-motion', 'false');
});

test('restores deep scroll and completes the visible decision route at the destination', async () => {
  let top = -window.innerHeight * 3;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    top, height: window.innerHeight * 6, bottom: top + window.innerHeight * 6,
    left: 0, right: 1024, width: 1024, x: 0, y: top, toJSON: () => ({}),
  }));
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('main')).toHaveAttribute('data-chapter', '3');
  expect(screen.getByRole('link', { name: '4. وضوح' })).toHaveAttribute('aria-current', 'step');
  top = -window.innerHeight * 5;
  fireEvent.click(screen.getByRole('button', { name: 'کاهش حرکت‌های صحنه' }));
  fireEvent.scroll(window);
  await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('data-chapter', '5'));
  expect(screen.getByRole('main')).toHaveAttribute('data-theme-phase', 'bright');
  await waitFor(() => expect(container.querySelector('.route-line')).toHaveAttribute('stroke-dashoffset', '0'));
  expect(container.querySelector('.route-destination')).toHaveAttribute('opacity', '1.000');
  expect(screen.getByRole('link', { name: '6. آینده' })).toHaveAttribute('aria-current', 'step');
  top = -window.innerHeight * 5.25;
  fireEvent.scroll(window);
  await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('data-showing-modules', 'true'));
});

test('removes its pointer listeners on unmount', () => {
  const remove = vi.spyOn(window, 'removeEventListener');
  const { unmount } = render(<AsumiApp />);
  unmount();
  expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));
  expect(remove).toHaveBeenCalledWith('pointerout', expect.any(Function));
});
