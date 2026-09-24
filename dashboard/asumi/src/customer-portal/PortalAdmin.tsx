import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { productModules } from '../product/modules';
import {
	getAdminSupportRequests,
	getCatalogAdmin,
	createMarketplacePlan as createMarketplacePlanRequest,
	saveCatalogMapping,
	updateAdminSupportRequest,
	updateMarketplacePlanPrices,
	type MarketplaceApp,
	type SupportRequest,
} from './portalApi';

type ModuleMapping = { module_id: string; mode: string; marketplace_app: string | null; published: number; description: string | null; customer_description: string | null; prerequisites: string[] };
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
	const [prerequisites, setPrerequisites] = useState<string[]>([]);
	const [priceDrafts, setPriceDrafts] = useState<Record<string, { price_inr: string; price_usd: string }>>({});
	const [creatingPlanFor, setCreatingPlanFor] = useState('');
	const [newPlanDraft, setNewPlanDraft] = useState({ title: '', price_inr: '', price_usd: '', interval: 'Monthly', features: '' });
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
					setDescription(firstMapping.customer_description || '');
					setPrerequisites(firstMapping.prerequisites || []);
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
	const mappedAppNames = useMemo(() => new Set(catalog?.mappings.filter(item => item.mode === 'Marketplace app').map(item => item.marketplace_app).filter((value): value is string => Boolean(value))), [catalog]);
	const managedApps = (catalog?.apps || []).filter(item => mappedAppNames.has(item.name));

	useEffect(() => {
		if (!currentMapping) return;
		setMode(currentMapping.mode);
		setApp(currentMapping.marketplace_app || '');
		setPublished(Boolean(currentMapping.published));
		setDescription(currentMapping.customer_description || '');
		setPrerequisites(currentMapping.prerequisites || []);
	}, [currentMapping]);

	async function saveMapping(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy('mapping'); setError(''); setNotice('');
		try {
			await saveCatalogMapping({ module_id: selectedModuleId, mode, marketplace_app: app || undefined, published, customer_description: description, prerequisites });
			setNotice('اتصال، پیش‌نیازها و وضعیت انتشار ماژول ذخیره شد.');
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

	function beginCreatePlan(app: MarketplaceApp) {
		const template = app.plans.find(plan => Boolean(plan.enabled)) || app.plans[0];
		const templateInterval = template?.interval;
		setCreatingPlanFor(app.name);
		setNewPlanDraft({
			title: `${template?.title || app.title} · نسخهٔ جدید`,
			price_inr: '',
			price_usd: '',
			interval: templateInterval && ['Daily', 'Monthly', 'Yearly'].includes(templateInterval) ? templateInterval : 'Monthly',
			features: (template?.features || []).join('\n'),
		});
	}

	async function createPlan(event: FormEvent<HTMLFormElement>, app: MarketplaceApp) {
		event.preventDefault();
		const features = newPlanDraft.features.split('\n').map(feature => feature.trim()).filter(Boolean);
		setBusy(`create:${app.name}`); setError(''); setNotice('');
		try {
			await createMarketplacePlanRequest({ marketplace_app: app.name, title: newPlanDraft.title.trim(), price_inr: newPlanDraft.price_inr, price_usd: newPlanDraft.price_usd, interval: newPlanDraft.interval, features });
			setCreatingPlanFor('');
			setNotice('پلن جدید در Marketplace ساخته شد؛ اشتراک‌های فعلی روی پلن قبلی می‌مانند.');
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
					<label className="customer-portal-admin-description"><span>توضیح تکمیلی سازگاری</span><textarea rows={3} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="نیازمندی‌های ویژهٔ نسخه، پلن یا اتصال‌های جانبی را بنویس" /></label>
					<fieldset className="customer-portal-admin-prerequisites"><legend>پیش‌نیازهای ماژول</legend><div>{productModules.filter(module => module.id !== selectedModuleId).map(module => <label key={module.id}><input type="checkbox" checked={prerequisites.includes(module.id)} onChange={event => setPrerequisites(current => event.target.checked ? [...current, module.id] : current.filter(item => item !== module.id))} /><span>{module.title}</span></label>)}</div><small>پیش‌نیازها پیش از نصب ماژول انتخاب‌شده بررسی و در صورت نیاز به انتخاب خرید اضافه می‌شوند.</small></fieldset>
					<label className="customer-portal-checkbox"><input type="checkbox" checked={published} onChange={event => setPublished(event.target.checked)} /><span>در کاتالوگ مشتری نمایش داده شود</span></label>
					<div className="customer-portal-admin-actions"><button type="submit" className="customer-portal-primary-button" disabled={busy === 'mapping'}>{busy === 'mapping' ? 'در حال ذخیره…' : 'ذخیرهٔ تنظیمات'}</button><span>سازگاری واقعی نصب نیز بر اساس سایت انتخاب‌شده بررسی می‌شود؛ قیمت از پلن Marketplace می‌آید.</span></div>
				</form>
			</section>

			<section className="customer-portal-panel" aria-labelledby="portal-plan-prices-title">
				<div className="customer-portal-panel-heading"><div><p>قیمت‌گذاری واقعی</p><h2 id="portal-plan-prices-title">پلن‌های Marketplace متصل</h2></div><span>ارزهای پشتیبانی‌شده: INR و USD</span></div>
				{managedApps.length ? <div className="customer-portal-admin-prices">{managedApps.map(app => <div className="customer-portal-admin-app" key={app.name}>
						<div><h3>{app.title}</h3><small>{app.app}</small></div>
						<button type="button" className="customer-portal-secondary-button customer-portal-admin-create-plan-button" disabled={Boolean(busy)} onClick={() => beginCreatePlan(app)}>ساخت پلن جدید</button>
						{creatingPlanFor === app.name && <form className="customer-portal-admin-plan-create" onSubmit={event => void createPlan(event, app)}>
							<label><span>نام پلن</span><input required maxLength={140} value={newPlanDraft.title} onChange={event => setNewPlanDraft(current => ({ ...current, title: event.target.value }))} /></label>
							<label><span>دورهٔ پرداخت</span><select value={newPlanDraft.interval} onChange={event => setNewPlanDraft(current => ({ ...current, interval: event.target.value }))}><option value="Monthly">ماهانه</option><option value="Yearly">سالانه</option><option value="Daily">روزانه با محاسبهٔ روزشمار</option></select></label>
							<label><span>قیمت INR</span><input required inputMode="decimal" type="number" min="0" step="0.01" value={newPlanDraft.price_inr} onChange={event => setNewPlanDraft(current => ({ ...current, price_inr: event.target.value }))} /></label>
							<label><span>قیمت USD</span><input required inputMode="decimal" type="number" min="0" step="0.01" value={newPlanDraft.price_usd} onChange={event => setNewPlanDraft(current => ({ ...current, price_usd: event.target.value }))} /></label>
							<label className="customer-portal-admin-plan-features"><span>امکانات پلن، هر مورد در یک خط</span><textarea required rows={4} maxLength={6000} value={newPlanDraft.features} onChange={event => setNewPlanDraft(current => ({ ...current, features: event.target.value }))} /></label>
							<p>این پلن از مسیر بومی Marketplace ساخته می‌شود و برای خریدهای جدید است؛ اشتراک‌های فعال روی پلن قبلی باقی می‌مانند.</p>
							<div className="customer-portal-card-actions"><button type="submit" className="customer-portal-primary-button" disabled={busy === `create:${app.name}`}>{busy === `create:${app.name}` ? 'در حال ساخت…' : 'ساخت پلن'}</button><button type="button" className="customer-portal-secondary-button" onClick={() => setCreatingPlanFor('')}>انصراف</button></div>
						</form>}
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
