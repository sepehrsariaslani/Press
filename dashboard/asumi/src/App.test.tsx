import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AsumiApp } from './App';
import { getAccountsPreviewHref } from './components/site/accountsPreviewRoute';
import { industryPaths } from './product/industries/industryData';
import { productModuleDetails } from './product/moduleDetails';
import { productModules } from './product/modules';
import { roleDashboards } from './product/roles/roleData';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.removeItem('asumi-pricing-selection-v2');
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
  fireEvent.click(screen.getByRole('link', { name: 'همه‌ی ماژول‌ها' }));
  await waitFor(() => expect(screen.getByRole('navigation', { name: '۱۵ ماژول آسومی' })).toBeInTheDocument());
});

test('supports opening a module directly from its deep link', () => {
  window.history.replaceState(null, '', '#module/crm');
  render(<AsumiApp />);
  expect(screen.getByRole('heading', { level: 1, name: 'مدیریت ارتباط با مشتری' })).toBeInTheDocument();
  expect(screen.getByText('CRM Deal')).toBeInTheDocument();
});

test('resolves the marketing module name to the growth detail page for direct links', () => {
  window.history.replaceState(null, '', '#module/marketing');
  render(<AsumiApp />);
  expect(screen.getByRole('heading', { level: 1, name: 'بازاریابی و رشد' })).toBeInTheDocument();
  expect(screen.getByText('Marketing Campaign Brief')).toBeInTheDocument();
});

test('opens the pricing configurator and shows the selected module features beside its chooser', () => {
  window.history.replaceState(null, '', '#pricing');
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('heading', { level: 1, name: /سیستمی را انتخاب کن/ })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'انتخاب بسته‌ی تعرفه' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'انتخاب ماژول‌های آسومی' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'مالی و حسابداری' })).toBeInTheDocument();
  expect(screen.getByText('دفتر کل و سندهای حسابداری')).toBeInTheDocument();
  expect(container.querySelector('.pricing-estimate-total')).toHaveTextContent('۵٬۵۰۰٬۰۰۰ تومان');
});

test('opens module pricing directly from the homepage module directory', async () => {
  window.history.replaceState(null, '', '/');
  render(<AsumiApp />);
  fireEvent.click(screen.getByRole('button', { name: /ساخت ترکیب و دیدن تعرفه‌ها/ }));
  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: /سیستمی را انتخاب کن/ })).toBeInTheDocument());
  expect(window.location.hash).toBe('#pricing');
});

test('adds growth when business planning is selected and blocks removing its prerequisite', () => {
  window.history.replaceState(null, '', '#pricing');
  const { container } = render(<AsumiApp />);
  fireEvent.click(screen.getByRole('button', { name: 'پاک‌کردن انتخاب' }));
  fireEvent.click(screen.getByRole('button', { name: /افزودن ماژول برنامه‌ریزی کسب‌وکار/ }));
  expect(screen.getByRole('status')).toHaveTextContent('پیش‌نیازش هم اضافه شد: بازاریابی و رشد');
  expect(container.querySelector('.pricing-selected-modules')).toHaveTextContent('بازاریابی و رشد · کسب‌وکار');
  expect(container.querySelector('.pricing-estimate-total')).toHaveTextContent('۷٬۳۰۰٬۰۰۰ تومان');
  fireEvent.click(screen.getByRole('button', { name: /حذف ماژول بازاریابی و رشد/ }));
  expect(screen.getByRole('status')).toHaveTextContent('برای حذف بازاریابی و رشد، ابتدا این ماژول‌های وابسته را حذف کن: کسب‌وکار');
  expect(container.querySelector('.pricing-estimate-total')).toHaveTextContent('۷٬۳۰۰٬۰۰۰ تومان');
});

test('switching to the complete package keeps a selected CRM module only once', () => {
  window.history.replaceState(null, '', '#pricing');
  const { container } = render(<AsumiApp />);
  fireEvent.click(screen.getByRole('button', { name: 'پاک‌کردن انتخاب' }));
  fireEvent.click(screen.getByRole('button', { name: /افزودن ماژول مدیریت ارتباط با مشتری/ }));
  expect(container.querySelector('.pricing-estimate-total')).toHaveTextContent('۲٬۵۰۰٬۰۰۰ تومان');
  fireEvent.click(screen.getByRole('button', { name: /همهٔ امکانات/ }));
  expect(container.querySelector('.pricing-estimate-total')).toHaveTextContent('۵۰٬۰۰۰٬۰۰۰ تومان');
  const selectedModules = container.querySelector('.pricing-selected-modules')?.textContent || '';
  expect(selectedModules.match(/CRM/g)).toHaveLength(1);
});

test('switching to the professional package keeps a selected CRM module only once', () => {
  window.history.replaceState(null, '', '#pricing');
  const { container } = render(<AsumiApp />);
  fireEvent.click(screen.getByRole('button', { name: 'پاک‌کردن انتخاب' }));
  fireEvent.click(screen.getByRole('button', { name: /افزودن ماژول مدیریت ارتباط با مشتری/ }));
  expect(container.querySelector('.pricing-estimate-total')).toHaveTextContent('۲٬۵۰۰٬۰۰۰ تومان');
  fireEvent.click(screen.getByRole('button', { name: /حرفه‌ای/ }));
  expect(container.querySelector('.pricing-estimate-total')).toHaveTextContent('۹٬۹۰۰٬۰۰۰ تومان');
  expect(container.querySelector('.pricing-estimate-discount')).toHaveTextContent('تخفیف بستهٔ حرفه‌ای');
  const selectedModules = container.querySelector('.pricing-selected-modules')?.textContent || '';
  expect(selectedModules.match(/CRM/g)).toHaveLength(1);
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
  expect(container.querySelector('[data-request-preview]')).toHaveTextContent('برای ۱۲۰ عدد از کد A');
  expect(container.querySelector('[data-request-preview] .paper-value')).toHaveAttribute('text-anchor', 'start');
  expect(container.querySelector('[data-sales-item="request"]')).toHaveTextContent('۱۲۰ عدد');
  expect(container.querySelector('[data-sales-item="request"]')).toHaveTextContent('از کد A قیمت می‌خواستم');
  expect(container.querySelector('[data-sales-item="quote"]')).toHaveTextContent('پیش‌فاکتور');
  expect(screen.getAllByRole('link', { name: /ورود به مرکز فروش/ })[0]).toHaveAttribute('href', '/hesab/modules/sales');
  expect(container.querySelector('.finance-story')).not.toBeInTheDocument();
});

test('opens a distinct Persian purchase story from demand through sourcing, receipt and invoice matching', () => {
  window.history.replaceState(null, '', '#module/procurement');
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('heading', { level: 1, name: 'یک کمبود، یک سؤال.' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /پرونده‌ی نمونه‌ی خرید/ })).toBeInTheDocument();
  expect(container.querySelector('.procurement-story')).toHaveAttribute('data-stage', '0');
  expect(container.querySelectorAll('.procurement-chapter-nav a')).toHaveLength(6);
  expect(container.querySelector('[data-evidence="request"]')).toHaveTextContent('۸۰');
  expect(container.querySelector('[data-evidence="request"]')).toHaveTextContent('۲۴');
  expect(container.querySelectorAll('[data-supplier]')).toHaveLength(3);
  expect(container.querySelector('[data-evidence="comparison"]')).toHaveTextContent('ارزان‌ترین همیشه مناسب‌ترین نیست');
  expect(container.querySelector('[data-evidence="order"]')).toHaveTextContent('PO-1405-00128');
  expect(container.querySelector('[data-evidence="receipt"]')).toHaveTextContent('۷۸');
  expect(container.querySelector('[data-evidence="quality"]')).toHaveTextContent('۲');
  expect(container.querySelector('[data-evidence="match"]')).toHaveTextContent('Purchase Invoice');
  expect(screen.getAllByRole('link', { name: /ورود به مرکز خرید/ })[0]).toHaveAttribute('href', '/hesab/modules/procurement');
  expect(screen.getByText('روایت نمونه · پیشنهادها و وضعیت‌ها نمایشی‌اند')).toBeInTheDocument();
});

test('presents purchase features as five connected boards with direct operational entries', () => {
  window.history.replaceState(null, '', '#module/procurement');
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('heading', { level: 2, name: 'از یک نیاز تا خریدی که می‌توانی توضیحش بدهی.' })).toBeInTheDocument();
  expect(container.querySelectorAll('.procurement-caseboard')).toHaveLength(5);
  expect(container.querySelectorAll('.procurement-caseboard-frame')).toHaveLength(5);
  expect(container.querySelectorAll('.procurement-caseboard-felt')).toHaveLength(5);
  expect(container.querySelectorAll('.procurement-caseboard-fasteners i')).toHaveLength(20);
  expect(container.querySelectorAll('[data-procurement-paper]')).toHaveLength(20);
  expect(container.querySelectorAll('[data-procurement-bridge]')).toHaveLength(4);
  expect(container.querySelector('[data-procurement-paper="request"]')).toHaveAttribute('href', '/hesab/material-requests?new=1');
  expect(container.querySelector('[data-procurement-paper="comparison"]')).toHaveAttribute('href', '/hesab/procurement/quotation-comparison');
  expect(container.querySelector('[data-procurement-paper="three-way"]')).toHaveAttribute('href', '/hesab/procurement/three-way');
  expect(container.querySelector('.procurement-related-modules a[href="#module/inventory"]')).toBeInTheDocument();
  expect(container.querySelector('.procurement-related-modules a[href="#module/finance"]')).toBeInTheDocument();
  expect(container.querySelector('.procurement-handoff-note')).toHaveTextContent('داده‌ی زنده‌ی شرکت شما نیستند');
});

test('keeps purchase-guide jump links within the story route', () => {
  window.history.replaceState(null, '', '#module/procurement');
  const scrollIntoView = vi.fn();
  const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  try {
    render(<AsumiApp />);
    fireEvent.click(screen.getByRole('link', { name: /استعلام و انتخاب تأمین‌کننده/ }));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(window.location.hash).toBe('#module/procurement');
    expect(screen.getByRole('heading', { level: 2, name: 'از یک نیاز تا خریدی که می‌توانی توضیحش بدهی.' })).toBeInTheDocument();
  } finally {
    if (originalScrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
    else delete (Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView;
  }
});

test('presents sales capabilities as four connected evidence boards after the story', () => {
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
  expect(screen.getByRole('heading', { level: 2, name: 'هر کاغذ، یک سرنخ؛ هر بورد، یک قدم جلوتر.' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 3, name: 'چهار بورد، یک مسیر پیوسته' })).toBeInTheDocument();
  expect(container.querySelectorAll('.sales-handoff [data-sales-board]')).toHaveLength(4);
  expect(container.querySelectorAll('[data-sales-paper]')).toHaveLength(16);
  expect(container.querySelectorAll('[data-sales-board-connector]')).toHaveLength(3);
  expect(container.querySelector('[data-sales-paper="quotation"]')).toHaveTextContent('پیش‌فاکتور');
  expect(container.querySelector('[data-sales-paper="sales-order"]')).toHaveTextContent('Sales Order');
  expect(container.querySelector('[data-sales-paper="delivery-note"]')).toHaveTextContent('حواله‌ی تحویل');
  expect(container.querySelector('[data-sales-paper="dashboard"] svg[role="img"]')).toHaveAttribute('aria-label', 'نمودار نمونه‌ی روند فروش، بدون داده‌ی زنده');
  expect(container.querySelector('[data-sales-paper="sms"]')).toHaveTextContent('نیازمند اتصال sms.ir');
  expect(screen.getByRole('link', { name: /اسناد معامله/ })).toHaveAttribute('href', '#sales-board-sales-documents');
  expect(container.querySelector('.sales-board-destinations a[href="/hesab/modules/inventory"]')).toBeInTheDocument();
  expect(container.querySelector('.sales-board-destinations a[href="/hesab/modules/finance"]')).toBeInTheDocument();
  expect(container.querySelector('.sales-handoff-note')).toHaveTextContent('داده‌ی زنده‌ی شرکت شما نیستند');
  expect(container.querySelector('.sales-board-destinations a[href="/hesab/crm/pipeline"]')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /ورود به مرکز فروش/ })[0]).toHaveAttribute('href', '/hesab/modules/sales');
});

test('keeps sales-guide jump links inside the sales page instead of routing on their section hashes', () => {
  window.history.replaceState(null, '', '#module/sales');
  const scrollIntoView = vi.fn();
  const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  try {
    render(<AsumiApp />);
    fireEvent.click(screen.getByRole('link', { name: /اسناد معامله/ }));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(window.location.hash).toBe('#module/sales');
    expect(screen.getByRole('heading', { level: 2, name: 'هر کاغذ، یک سرنخ؛ هر بورد، یک قدم جلوتر.' })).toBeInTheDocument();
  } finally {
    if (originalScrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
    else delete (Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView;
  }
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

test('shows the actual Accounts workspace for the selected role and its related module routes', () => {
  const { container } = render(<AsumiApp />);
  const rolePicker = screen.getByRole('group', { name: 'انتخاب نقش برای بازکردن صفحه‌ی واقعی' });
  expect(rolePicker.querySelectorAll('button')).toHaveLength(11);
  expect(screen.getByTitle('محیط واقعی آسومی برای مدیر کسب‌وکار، داشبورد مدیریتی')).toHaveAttribute('src', '/hesab/manager-dashboard');
  fireEvent.click(screen.getByRole('button', { name: 'مدیر مالی' }));
  expect(screen.getByTitle('محیط واقعی آسومی برای مدیر مالی، مالی')).toHaveAttribute('src', '/hesab/modules/finance');
  expect(container.querySelector('.role-picker button[aria-pressed="true"]')).toHaveTextContent('مدیر مالی');
  const roleModules = screen.getByRole('group', { name: 'صفحه‌های مرتبط را در محیط واقعی باز کن' });
  fireEvent.click(within(roleModules).getByRole('button', { name: 'خرید' }));
  expect(screen.getByTitle('محیط واقعی آسومی برای مدیر مالی، خرید')).toHaveAttribute('src', '/hesab/modules/procurement');
  expect(container.querySelector('.role-live-preview-note')).toHaveTextContent('برای دیدن دسترسی دقیق مدیر دیگر، باید با حساب همان نقش وارد شوید');
});

test('routes role previews to the actual Accounts host locally and stays same-origin in production', () => {
  expect(getAccountsPreviewHref('/hesab/modules/finance', '/assets/press/asumi_site/index.html'))
    .toBe('http://asumi:8000/hesab/modules/finance');
  expect(getAccountsPreviewHref('/hesab/modules/finance', '/'))
    .toBe('/hesab/modules/finance');
});

test('renders industry workflows from existing Asumi modules and opens a selected module', async () => {
  const { container } = render(<AsumiApp />);
  expect(container.querySelectorAll('.industry-path-card')).toHaveLength(5);
  expect(screen.getByText('از برنامه و BOM تا ثبت تولید و بررسی کیفیت')).toBeInTheDocument();
  fireEvent.click(container.querySelector('.industry-path-card .industry-module-list button')!);
  await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'تولید' })).toBeInTheDocument());
});

test('keeps role and industry module references inside the existing catalog', () => {
  const moduleIds = new Set(productModules.map(module => module.id));
  expect(roleDashboards.every(role => role.moduleIds.every(id => moduleIds.has(id)))).toBe(true);
  expect(industryPaths.every(industry => industry.moduleIds.every(id => moduleIds.has(id)))).toBe(true);
  expect(roleDashboards.map(role => role.id)).toHaveLength(11);
  expect(new Set(roleDashboards.flatMap(role => role.moduleIds)).size).toBe(productModules.length);
  expect(roleDashboards.every(role => role.entryPath?.startsWith('/') || productModuleDetails[role.moduleIds[0]]?.entryPath.startsWith('/'))).toBe(true);
  expect(industryPaths.map(industry => industry.id)).toHaveLength(5);
});

test('shows the shared navigation and footer from the pricing page and returns to homepage sections', async () => {
  window.history.replaceState(null, '', '#pricing');
  render(<AsumiApp />);
  expect(screen.getByRole('navigation', { name: 'ناوبری اصلی آسومی' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'پیوندهای پایین صفحه' })).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('navigation', { name: 'ناوبری اصلی آسومی' })).getByRole('link', { name: 'صنایع' }));
  await waitFor(() => expect(screen.getByRole('region', { name: /هر صنعت/ })).toBeInTheDocument());
});
