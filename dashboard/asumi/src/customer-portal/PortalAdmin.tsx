import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { productModules } from '../product/modules';
import {
	getAdminSupportRequests,
	getCatalogAdmin,
	saveCatalogMapping,
	updateAdminSupportRequest,
	updateMarketplacePlanPrices,
	type MarketplaceApp,
	type SupportRequest,
} from './portalApi';

type ModuleMapping = { module_id: string; mode: string; marketplace_app: string | null; published: number; description: string | null };
type AdminCatalog = { apps: MarketplaceApp[]; mappings: ModuleMapping[] };

const modes = [
	{ value: 'Included', label: 'شامل امکانات پایه' },
	{ value: 'Marketplace app', label: 'افزونهٔ Marketplace قابل خرید' },
	{ value: 'Purchase request', label: 'درخواست خرید و بررسی' },
];
const ticketStatuses = [
	{ value: 'Open', label: 'ثبت‌شده' },
	{ value: 'In Progress', label: 'در حال بررسی' },
	{ value: 'Waiting on Customer', label: 'منتظر پاسخ مشتری' },
	{ value: 'Resolved', label: 'پاسخ داده‌شده' },
	{ value: 'Closed', label: 'بسته‌شده' },
];

export function PortalAdmin({ canManageCatalog, canManageSupport }: { canManageCatalog: boolean; canManageSupport: boolean }) {
	const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
	const [tickets, setTickets] = useState<Array<SupportRequest & { team: string }>>([]);
	const [selectedModuleId, setSelectedModuleId] = useState(productModules[0].id);
	const [mode, setMode] = useState(modes[0].value);
	const [app, setApp] = useState('');
	const [published, setPublished] = useState(true);
	const [description, setDescription] = useState('');
	const [priceDrafts, setPriceDrafts] = useState<Record<string, { price_inr: string; price_usd: string }>>({});
	const [ticketDrafts, setTicketDrafts] = useState<Record<string, { status: string; response: string }>>({});
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState('');
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	async function load(signal?: AbortSignal) {
		try {
			const [nextCatalog, nextTickets] = await Promise.all([
				canManageCatalog ? getCatalogAdmin(signal) : Promise.resolve(null),
				canManageSupport ? getAdminSupportRequests(signal) : Promise.resolve([]),
			]);
			if (signal?.aborted) return;
			if (nextCatalog) {
				setCatalog(nextCatalog);
				const firstMapping = nextCatalog.mappings[0];
				if (firstMapping) {
					setSelectedModuleId(current => nextCatalog.mappings.some(item => item.module_id === current) ? current : firstMapping.module_id);
					setMode(firstMapping.mode);
					setApp(firstMapping.marketplace_app || '');
					setPublished(Boolean(firstMapping.published));
					setDescription(firstMapping.description || '');
				}
				const prices: typeof priceDrafts = {};
				for (const entry of nextCatalog.apps) for (const plan of entry.plans) prices[plan.name] = { price_inr: String(plan.price_inr ?? 0), price_usd: String(plan.price_usd ?? 0) };
				setPriceDrafts(prices);
			}
			setTickets(nextTickets);
			setError('');
		} catch (caught) { if (!signal?.aborted) setError(messageOf(caught)); }
		finally { if (!signal?.aborted) setLoading(false); }
	}

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => controller.abort();
	}, [canManageCatalog, canManageSupport]);

	const currentMapping = catalog?.mappings.find(item => item.module_id === selectedModuleId);
	const mappedAppNames = useMemo(() => new Set(catalog?.mappings.map(item => item.marketplace_app).filter((value): value is string => Boolean(value))), [catalog]);
	const managedApps = (catalog?.apps || []).filter(item => mappedAppNames.has(item.name));

	useEffect(() => {
		if (!currentMapping) return;
		setMode(currentMapping.mode);
		setApp(currentMapping.marketplace_app || '');
		setPublished(Boolean(currentMapping.published));
		setDescription(currentMapping.description || '');
	}, [currentMapping]);

	async function saveMapping(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy('mapping'); setError(''); setNotice('');
		try {
			await saveCatalogMapping({ module_id: selectedModuleId, mode, marketplace_app: app || undefined, published, description });
			setNotice('اتصال ماژول به کاتالوگ آسومی ذخیره شد.');
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(''); }
	}

	async function savePrices(planName: string) {
		const values = priceDrafts[planName];
		if (!values) return;
		setBusy(planName); setError(''); setNotice('');
		try {
			await updateMarketplacePlanPrices({ plan: planName, ...values });
			setNotice('قیمت در پلن اصلی Marketplace ذخیره شد.');
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(''); }
	}

	async function updateTicket(ticket: SupportRequest & { team: string }) {
		const values = ticketDrafts[ticket.name];
		if (!values) return;
		setBusy(ticket.name); setError('');
		try {
			await updateAdminSupportRequest({ name: ticket.name, status: values.status, response: values.response });
			setTicketDrafts(current => ({ ...current, [ticket.name]: { status: values.status, response: '' } }));
			setNotice(`وضعیت درخواست ${ticket.name} به‌روز شد.`);
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(''); }
	}

	if (loading) return <div className="customer-portal-state" role="status">در حال دریافت تنظیمات مدیریتی…</div>;
	return <div className="customer-portal-workspace">
		<section className="customer-portal-panel" aria-labelledby="portal-admin-title">
			<div className="customer-portal-panel-heading"><div><p>فقط برای مدیران آسومی</p><h2 id="portal-admin-title">مدیریت کاتالوگ و درخواست‌ها</h2></div><span>جدا از پنل مشتری</span></div>
			<p className="customer-portal-help-copy">این صفحه قیمت افزونه‌ها را از پلن‌های فعال Marketplace می‌خواند و اتصال ماژول‌های آسومی را تنظیم می‌کند؛ سابقهٔ مالی جداگانه‌ای ساخته نمی‌شود.</p>
			{error && <div className="customer-portal-inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => { setLoading(true); void load(); }}>تلاش دوباره</button></div>}
			{notice && <p className="customer-portal-inline-status" role="status">{notice}</p>}
		</section>

		{canManageCatalog && <>
			<section className="customer-portal-panel" aria-labelledby="portal-mapping-title">
				<div className="customer-portal-panel-heading"><div><p>تعریف کاتالوگ مشتری</p><h2 id="portal-mapping-title">اتصال ماژول به افزونه</h2></div></div>
				<form className="customer-portal-admin-form" onSubmit={event => void saveMapping(event)}>
					<label><span>ماژول آسومی</span><select value={selectedModuleId} onChange={event => setSelectedModuleId(event.target.value)}>{productModules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
					<label><span>نوع نمایش و خرید</span><select value={mode} onChange={event => setMode(event.target.value)}>{modes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
					{mode === 'Marketplace app' && <label><span>افزونهٔ مرجع</span><select value={app} required onChange={event => setApp(event.target.value)}><option value="">انتخاب افزونه</option>{catalog?.apps.map(item => <option key={item.name} value={item.name}>{item.title} · {item.app}</option>)}</select></label>}
					<label className="customer-portal-admin-description"><span>پیش‌نیازها و توضیح سازگاری</span><textarea rows={3} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="مثلاً نیاز به ماژول انبار یا نسخهٔ مشخص ERPNext" /></label>
					<label className="customer-portal-checkbox"><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} /><span>در کاتالوگ مشتری نمایش داده شود</span></label>
					<div className="customer-portal-admin-actions"><button type="submit" className="customer-portal-primary-button" disabled={busy === 'mapping'}>{busy === 'mapping' ? 'در حال ذخیره…' : 'ذخیرهٔ تنظیمات'}</button><span>سازگاری واقعی نصب نیز بر اساس سایت انتخاب‌شده بررسی می‌شود؛ قیمت از پلن Marketplace می‌آید.</span></div>
				</form>
			</section>

			<section className="customer-portal-panel" aria-labelledby="portal-plan-prices-title">
				<div className="customer-portal-panel-heading"><div><p>قیمت‌گذاری واقعی</p><h2 id="portal-plan-prices-title">پلن‌های Marketplace متصل</h2></div><span>ارزهای پشتیبانی‌شده: INR و USD</span></div>
				{managedApps.length ? <div className="customer-portal-admin-prices">{managedApps.map(app => <div className="customer-portal-admin-app" key={app.name}>
						<div><h3>{app.title}</h3><small>{app.app}</small></div>
						{app.plans.map(plan => <div className="customer-portal-admin-plan" key={plan.name}>
							<div><strong>{plan.title}</strong><small>{plan.name} · {periodLabel(plan.interval)}</small></div>
							<label><span>INR</span><input inputMode="decimal" value={priceDrafts[plan.name]?.price_inr || ''} onChange={event => setPriceDrafts(current => ({ ...current, [plan.name]: { ...current[plan.name], price_inr: event.target.value } }))} /></label>
							<label><span>USD</span><input inputMode="decimal" value={priceDrafts[plan.name]?.price_usd || ''} onChange={event => setPriceDrafts(current => ({ ...current, [plan.name]: { ...current[plan.name], price_usd: event.target.value } }))} /></label>
							<button type="button" className="customer-portal-secondary-button" disabled={busy === plan.name} onClick={() => void savePrices(plan.name)}>{busy === plan.name ? 'ذخیره…' : 'ذخیرهٔ قیمت'}</button>
						</div>)}
					</div>)}</div> : <div className="customer-portal-inline-state">هنوز ماژولی به پلن قابل خرید Marketplace متصل نشده است.</div>}
				<p className="customer-portal-footnote">قیمت‌های تومانی صفحهٔ معرفی آسومی برای پرداخت این اشتراک استفاده نمی‌شوند. برای خرید واقعی، ماژول باید به پلن فعال Marketplace وصل باشد؛ مبلغ نهایی از صورتحساب حساب خوانده می‌شود.</p>
			</section>
		</>}

		{canManageSupport && <section className="customer-portal-panel" aria-labelledby="portal-admin-support-title">
			<div className="customer-portal-panel-heading"><div><p>صف پشتیبانی</p><h2 id="portal-admin-support-title">درخواست‌های مشتریان</h2></div><span>{tickets.length} درخواست اخیر</span></div>
			{tickets.length ? <div className="customer-portal-admin-tickets">{tickets.map(ticket => {
				const draft = ticketDrafts[ticket.name] || { status: ticket.status, response: '' };
				return <article className="customer-portal-admin-ticket" key={ticket.name}>
					<div className="customer-portal-ticket-title"><div><p>{ticket.name} · {ticket.team}{ticket.site ? ` · ${ticket.site}` : ''}</p><h3>{ticket.subject}</h3></div><span className="customer-portal-status" data-status={ticket.status.toLowerCase().replaceAll(' ', '-')}>{ticket.category}</span></div>
					<p className="customer-portal-ticket-message">{ticket.message}</p>
					{ticket.messages?.length ? <div className="customer-portal-ticket-thread" aria-label="گفت‌وگوی درخواست">{ticket.messages.map(item => <article key={item.name}><small>{item.comment_by} · {formatDateTime(item.creation)}</small><p>{item.content}</p></article>)}</div> : null}
					<div className="customer-portal-admin-ticket-actions"><label><span>وضعیت</span><select value={draft.status} onChange={event => setTicketDrafts(current => ({ ...current, [ticket.name]: { ...draft, status: event.target.value } }))}>{ticketStatuses.map(status => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label><label className="customer-portal-resolution-input"><span>پاسخ برای مشتری</span><textarea rows={2} value={draft.response} onChange={event => setTicketDrafts(current => ({ ...current, [ticket.name]: { ...draft, response: event.target.value } }))} /></label><button type="button" className="customer-portal-primary-button" disabled={busy === ticket.name} onClick={() => void updateTicket(ticket)}>{busy === ticket.name ? 'ذخیره…' : 'ثبت پاسخ و وضعیت'}</button></div>
				</article>;
			})}</div> : <div className="customer-portal-inline-state">درخواست پشتیبانی جدیدی ثبت نشده است.</div>}
		</section>}
	</div>;
}

function messageOf(error: unknown) {
	return error instanceof Error ? error.message : 'ذخیرهٔ تنظیمات مدیریتی انجام نشد.';
}

function formatDateTime(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function periodLabel(interval?: string | null) {
	if (interval === 'Yearly' || interval === 'Annual' || interval === 'Annually') return 'سالانه';
	if (interval === 'Daily') return 'نرخ ماهانه با محاسبهٔ روزشمار';
	return 'ماهانه';
}
