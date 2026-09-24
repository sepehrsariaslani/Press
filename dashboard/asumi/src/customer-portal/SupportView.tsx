import { useEffect, useState, type FormEvent } from 'react';
import { productModules } from '../product/modules';
import {
	createSupportRequest,
	getSupportRequest,
	getSupportRequests,
	replySupportRequest,
	type PortalSite,
	type SupportRequest,
} from './portalApi';

type Props = {
	sites: PortalSite[];
	selectedSite: string;
	initialPurchaseModuleIds?: string[];
	initialContext?: string;
};

const categoryLabels: Record<string, string> = { Technical: 'فنی', Billing: 'صورتحساب و پرداخت', Purchase: 'خرید ماژول', Other: 'سایر' };
const statusLabels: Record<string, string> = { Open: 'ثبت‌شده', 'In Progress': 'در حال بررسی', 'Waiting on Customer': 'نیازمند پاسخ شما', Resolved: 'پاسخ داده‌شده', Closed: 'بسته‌شده' };

export function SupportView({ sites, selectedSite, initialPurchaseModuleIds = [], initialContext = '' }: Props) {
	const purchaseDraft = createPurchaseDraft(initialPurchaseModuleIds);
	const [requests, setRequests] = useState<SupportRequest[]>([]);
	const [selected, setSelected] = useState<SupportRequest | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [subject, setSubject] = useState(purchaseDraft.subject);
	const [message, setMessage] = useState([purchaseDraft.message, initialContext].filter(Boolean).join('\n\n'));
	const [category, setCategory] = useState(initialPurchaseModuleIds.length ? 'Purchase' : initialContext ? 'Billing' : 'Technical');
	const [site, setSite] = useState(selectedSite);
	const [reply, setReply] = useState('');
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	async function load(signal?: AbortSignal) {
		try {
			const next = await getSupportRequests(signal);
			if (!signal?.aborted) { setRequests(next); setError(''); }
		} catch (caught) {
			if (!signal?.aborted) setError(messageOf(caught));
		} finally { if (!signal?.aborted) setLoading(false); }
	}

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => controller.abort();
	}, []);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitting(true); setError(''); setNotice('');
		try {
			const created = await createSupportRequest({ subject: subject.trim(), message: message.trim(), category, site: site || undefined });
			setSubject(''); setMessage(''); setSelected(created); setNotice(`درخواست ${created.name} ثبت شد؛ پاسخ را در همین پنل پیگیری کن.`);
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setSubmitting(false); }
	}

	async function openRequest(name: string) {
		setError('');
		try { setSelected(await getSupportRequest(name)); }
		catch (caught) { setError(messageOf(caught)); }
	}

	async function sendReply(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selected || !reply.trim()) return;
		setSubmitting(true); setError('');
		try {
			const next = await replySupportRequest(selected.name, reply.trim());
			setSelected(next); setReply(''); setNotice('پیامت به درخواست اضافه شد.'); await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setSubmitting(false); }
	}

	return <div className="customer-portal-workspace customer-portal-support-layout">
		<section className="customer-portal-panel" aria-labelledby="portal-support-title">
			<div className="customer-portal-panel-heading"><div><p>پشتیبانی آسومی</p><h2 id="portal-support-title">درخواست‌ها و پیگیری</h2></div><span>وضعیت و پاسخ‌ها در همین پنل ثبت می‌شوند</span></div>
			{error && <div className="customer-portal-inline-error" role="alert"><span>{error}</span></div>}
			{notice && <p className="customer-portal-inline-status" role="status">{notice}</p>}
			<div className="customer-portal-support-list">
				{loading ? <div className="customer-portal-inline-state" role="status">در حال دریافت درخواست‌ها…</div> : requests.length ? requests.map(request => <button type="button" className="customer-portal-support-row" key={request.name} aria-pressed={selected?.name === request.name} onClick={() => void openRequest(request.name)}><span><strong>{request.subject}</strong><small>{request.name} · {categoryLabels[request.category] || request.category}</small></span><StatusPill status={request.status} label={statusLabels[request.status] || request.status} /></button>) : <div className="customer-portal-inline-state">درخواستی نداری؛ اگر کمکی لازم داری فرم را پر کن.</div>}
			</div>
			{selected && <TicketDetail request={selected} reply={reply} busy={submitting} onReplyChange={setReply} onReply={sendReply} />}
		</section>

		<section className="customer-portal-panel" aria-labelledby="portal-support-form-title">
			<div className="customer-portal-panel-heading"><div><p>{category === 'Purchase' ? 'درخواست خرید' : category === 'Billing' ? 'کمک مالی' : 'راه ارتباط'}</p><h2 id="portal-support-form-title">ثبت درخواست جدید</h2></div></div>
			<form className="customer-portal-support-form" onSubmit={event => void submit(event)}>
				<label><span>موضوع</span><input required maxLength={140} value={subject} onChange={event => setSubject(event.target.value)} placeholder="خلاصهٔ درخواستت" /></label>
				<div className="customer-portal-form-columns">
					<label><span>دسته‌بندی</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="Technical">فنی</option><option value="Billing">صورتحساب و پرداخت</option><option value="Purchase">خرید ماژول</option><option value="Other">سایر</option></select></label>
					<label><span>سایت مربوط</span><select value={site} onChange={event => setSite(event.target.value)}><option value="">بدون انتخاب سایت</option>{sites.map(item => <option key={item.name} value={item.name}>{item.label}</option>)}</select></label>
				</div>
				<label><span>شرح درخواست</span><textarea required maxLength={10000} rows={7} value={message} onChange={event => setMessage(event.target.value)} placeholder="جزئیات را بنویس تا تیم آسومی پیگیری کند." /></label>
				<p className="customer-portal-footnote">اگر درخواست خرید ثبت می‌کنی، این مرحله سفارش مالی یا فعال‌سازی خودکار نیست؛ تیم آسومی درخواست را بررسی می‌کند و وضعیتش در همین صفحه پیگیری می‌شود.</p>
				<button type="submit" className="customer-portal-primary-button" disabled={submitting || !subject.trim() || !message.trim()}>{submitting ? 'در حال ثبت…' : 'ثبت درخواست'}</button>
			</form>
		</section>
	</div>;
}

function TicketDetail({ request, reply, busy, onReplyChange, onReply }: { request: SupportRequest; reply: string; busy: boolean; onReplyChange: (value: string) => void; onReply: (event: FormEvent<HTMLFormElement>) => void }) {
	return <article className="customer-portal-ticket-detail">
		<div className="customer-portal-ticket-title"><div><p>{request.name} · {categoryLabels[request.category] || request.category}</p><h3>{request.subject}</h3></div><StatusPill status={request.status} label={statusLabels[request.status] || request.status} /></div>
		<p className="customer-portal-ticket-message">{request.message}</p>
		{request.resolution && <div className="customer-portal-resolution"><strong>یادداشت تیم پشتیبانی</strong><p>{request.resolution}</p></div>}
		{request.messages?.length ? <div className="customer-portal-ticket-thread" aria-label="گفت‌وگوی درخواست">{request.messages.map(item => <article key={item.name}><small>{item.comment_by} · {formatDateTime(item.creation)}</small><p>{item.content}</p></article>)}</div> : null}
		{!['Resolved', 'Closed'].includes(request.status) && <form className="customer-portal-reply-form" onSubmit={onReply}><label><span>پاسخ یا اطلاعات تکمیلی</span><textarea rows={3} value={reply} onChange={event => onReplyChange(event.target.value)} required maxLength={10000} /></label><button className="customer-portal-secondary-button" type="submit" disabled={busy || !reply.trim()}>{busy ? 'در حال ارسال…' : 'افزودن پیام'}</button></form>}
	</article>;
}

function createPurchaseDraft(moduleIds: string[]) {
	const modules = moduleIds.map(id => productModules.find(module => module.id === id)).filter((module): module is (typeof productModules)[number] => Boolean(module));
	if (!modules.length) return { subject: '', message: '' };
	const message = `درخواست بررسی برای خرید یا برآورد این ماژول‌ها:\n${modules.map(module => `• ${module.title}`).join('\n')}\n\nمی‌دانم که این درخواست، پرداخت یا فعال‌سازی خودکار نیست.`;
	return { subject: `درخواست خرید ماژول‌های آسومی (${modules.length})`, message };
}

function StatusPill({ status, label }: { status: string; label: string }) {
	return <span className="customer-portal-status" data-status={status.toLowerCase().replaceAll(' ', '-')}>{label}</span>;
}

function formatDateTime(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function messageOf(error: unknown) {
	return error instanceof Error ? error.message : 'ثبت درخواست ممکن نشد.';
}
