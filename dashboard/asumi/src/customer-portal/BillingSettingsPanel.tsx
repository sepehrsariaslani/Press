import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';
import {
	changePaymentMode,
	finishCardSetup,
	getBillingSettings,
	getCardSetupIntent,
	getCountries,
	getPaymentMethods,
	removePaymentMethod,
	saveBillingDetails,
	setDefaultPaymentMethod,
	type BillingAddress,
	type BillingSettings,
	type PaymentMethod,
} from './portalApi';
import { usePortalConfirmation } from './PortalConfirmation';

const emptyAddress: BillingAddress = { address: '', city: '', state: '', postal_code: '', country: '', gstin: '' };
const modeLabels: Record<string, string> = { Card: 'کارت بانکی', 'Prepaid Credits': 'اعتبار حساب', 'Paid By Partner': 'پرداخت توسط همکار', 'UPI Autopay': 'پرداخت خودکار UPI' };

export function BillingSettingsPanel() {
	const { confirm, dialog: confirmationDialog } = usePortalConfirmation();
	const [settings, setSettings] = useState<BillingSettings | null>(null);
	const [cards, setCards] = useState<PaymentMethod[]>([]);
	const [countries, setCountries] = useState<Array<{ name: string; code: string }>>([]);
	const [address, setAddress] = useState<BillingAddress>(emptyAddress);
	const [billingName, setBillingName] = useState('');
	const [editingAddress, setEditingAddress] = useState(false);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [cardPhase, setCardPhase] = useState<'closed' | 'ready'>('closed');
	const [setupClientSecret, setSetupClientSecret] = useState('');
	const [publishableKey, setPublishableKey] = useState('');
	const [cardError, setCardError] = useState('');
	const [cardReady, setCardReady] = useState(false);
	const cardHost = useRef<HTMLDivElement | null>(null);
	const stripe = useRef<Stripe | null>(null);
	const card = useRef<StripeCardElement | null>(null);
	const hasAddress = Boolean(settings && settings.address.country && settings.address.address);

	const load = useCallback(async (signal?: AbortSignal) => {
		setLoading(true);
		setError('');
		try {
			const [nextSettings, nextCards, nextCountries] = await Promise.all([
				getBillingSettings(signal), getPaymentMethods(signal), getCountries(signal),
			]);
			if (signal?.aborted) return;
			setSettings(nextSettings);
			setCards(nextCards);
			setCountries(nextCountries);
			setBillingName(nextSettings.billing_name);
			setAddress({ ...emptyAddress, ...nextSettings.address });
			setEditingAddress(!nextSettings.address.country || !nextSettings.address.address);
		} catch (caught) {
			if (!signal?.aborted) setError(messageOf(caught));
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => controller.abort();
	}, [load]);

	useEffect(() => {
		if (cardPhase !== 'ready' || !publishableKey || !cardHost.current) return;
		let active = true;
		void loadStripe(publishableKey).then(instance => {
			if (!active || !cardHost.current) return;
			if (!instance) { setError('اتصال امن به درگاه برقرار نشد. دوباره تلاش کن.'); return; }
			stripe.current = instance;
			const element = instance.elements().create('card', {
				hidePostalCode: true,
				style: { base: { color: '#28231f', fontFamily: 'Vazirmatn, sans-serif', fontSize: '14px', '::placeholder': { color: '#8b837a' } }, invalid: { color: '#a92532' } },
			});
			card.current = element;
			element.mount(cardHost.current);
			element.on('change', event => setCardError(event.error?.message || ''));
			element.on('ready', () => { if (active) setCardReady(true); });
		}).catch(caught => { if (active) setError(messageOf(caught)); });
		return () => {
			active = false;
			setCardReady(false);
			card.current?.destroy();
			card.current = null;
		};
	}, [cardPhase, publishableKey]);

	async function submitAddress(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true); setError(''); setNotice('');
		try {
			const next = await saveBillingDetails(billingName.trim(), address);
			setSettings(next);
			setAddress({ ...emptyAddress, ...next.address });
			setEditingAddress(false);
			setNotice('اطلاعات صورتحساب ذخیره شد.');
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	async function addCard() {
		if (!hasAddress) { setEditingAddress(true); setError('برای افزودن کارت، ابتدا نشانی صورتحساب را ذخیره کن.'); return; }
		setBusy(true); setError(''); setCardError('');
		try {
			const result = await getCardSetupIntent();
			setSetupClientSecret(result.setup_intent.client_secret);
			setPublishableKey(result.publishable_key);
			setCardPhase('ready');
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	async function confirmAddCard() {
		if (!stripe.current || !card.current || !setupClientSecret || !settings) return;
		setBusy(true); setError('');
		try {
			const result = await stripe.current.confirmCardSetup(setupClientSecret, {
				payment_method: {
					card: card.current,
					billing_details: {
						name: settings.billing_name,
						address: {
							line1: settings.address.address,
							city: settings.address.city,
							state: settings.address.state,
							postal_code: settings.address.postal_code,
							country: settings.billing_country_code?.toUpperCase() || undefined,
						},
					},
				},
			});
			if (result.error) throw new Error(result.error.message || 'ثبت کارت انجام نشد.');
			if (result.setupIntent?.status !== 'succeeded') throw new Error('تأیید کارت کامل نشد؛ دوباره تلاش کن.');
			await finishCardSetup(result.setupIntent);
			setCardPhase('closed');
			setNotice('کارت با موفقیت به حساب اضافه شد.');
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	async function updateCard(action: 'default' | 'remove', method: PaymentMethod) {
		if (action === 'remove' && !await confirm({
			title: 'حذف کارت پرداخت',
			description: `کارت •••• ${method.last_4} از حساب حذف شود؟`,
			note: 'اگر این کارت روش پیش‌فرض پرداخت باشد یا فاکتور باز داشته باشی، Press ممکن است حذف آن را نپذیرد.',
			confirmLabel: 'حذف کارت',
			appearance: 'danger',
		})) return;
		setBusy(true); setError(''); setNotice('');
		try {
			if (action === 'default') await setDefaultPaymentMethod(method.name);
			else {
				const result = await removePaymentMethod(method.name);
				if (result === 'Unpaid Invoices') throw new Error('تا زمان پرداخت فاکتورهای باز، آخرین کارت ذخیره‌شده قابل حذف نیست.');
			}
			setNotice(action === 'default' ? 'کارت پیش‌فرض تغییر کرد.' : 'کارت از حساب حذف شد.');
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	async function updateMode(mode: string) {
		setBusy(true); setError(''); setNotice('');
		try {
			await changePaymentMode(mode);
			setNotice('روش پرداخت حساب تغییر کرد.');
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	if (loading) return <div className="customer-portal-inline-state" role="status">در حال دریافت تنظیمات مالی…</div>;
	return <>
	<section className="customer-portal-panel customer-portal-billing-settings" aria-labelledby="billing-settings-title">
		<div className="customer-portal-panel-heading"><div><p>حساب مالی</p><h2 id="billing-settings-title">روش پرداخت و اطلاعات صورتحساب</h2></div></div>
		{error && <div className="customer-portal-inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => { setError(''); void load(); }}>تلاش دوباره</button></div>}
		{notice && <p className="customer-portal-inline-status" role="status">{notice}</p>}
		<div className="customer-portal-billing-settings-grid">
			<section className="customer-portal-billing-setting-card" aria-labelledby="billing-mode-title">
				<div className="customer-portal-subheading"><h3 id="billing-mode-title">روش پرداخت</h3><p>هزینه‌ها مطابق روش پرداخت انتخاب‌شده برای حساب پردازش می‌شوند.</p></div>
				<label className="customer-portal-search"><span>روش فعلی</span><select value={settings?.payment_mode || ''} disabled={busy} onChange={event => void updateMode(event.target.value)}><option value="">انتخاب روش پرداخت</option>{settings?.payment_mode && !['Card', 'Prepaid Credits'].includes(settings.payment_mode) && <option value={settings.payment_mode}>{modeLabels[settings.payment_mode] || settings.payment_mode}</option>}<option value="Card" disabled={!cards.length && settings?.payment_mode !== 'Card'}>کارت بانکی{!cards.length && settings?.payment_mode !== 'Card' ? ' · ابتدا کارت اضافه کن' : ''}</option><option value="Prepaid Credits">اعتبار حساب</option></select></label>
				<p className="customer-portal-footnote">{settings?.payment_mode === 'Card' ? 'هزینهٔ اشتراک به کارت پیش‌فرض صورتحساب می‌شود.' : settings?.payment_mode === 'Prepaid Credits' ? 'هزینه‌ها از اعتبار موجود حساب کم می‌شوند.' : 'برای تکمیل این روش پرداخت ممکن است تنظیمات بیشتری لازم باشد.'}</p>
			</section>
			<section className="customer-portal-billing-setting-card" aria-labelledby="billing-cards-title">
				<div className="customer-portal-subheading"><h3 id="billing-cards-title">کارت‌های ذخیره‌شده</h3><p>اطلاعات کارت به‌صورت امن توسط Stripe نگهداری می‌شود.</p></div>
				{cards.length ? <div className="customer-portal-payment-method-list">{cards.map(method => <article className="customer-portal-payment-method" key={method.name}><div><strong>{method.brand || 'کارت'} ···· {method.last_4}</strong><small>{method.name_on_card || 'دارندهٔ کارت'} · {String(method.expiry_month).padStart(2, '0')}/{method.expiry_year}</small></div>{method.is_default ? <span className="customer-portal-status" data-status="active">پیش‌فرض</span> : <button type="button" className="customer-portal-text-button" disabled={busy} onClick={() => void updateCard('default', method)}>انتخاب پیش‌فرض</button>}<button type="button" className="customer-portal-text-button" disabled={busy} onClick={() => void updateCard('remove', method)}>حذف</button></article>)}</div> : <p className="customer-portal-inline-state">هنوز کارتی به حساب وصل نشده است.</p>}
				{cardPhase === 'closed' ? <button type="button" className="customer-portal-secondary-button" disabled={busy} onClick={() => void addCard()}>افزودن کارت بانکی</button> : <div className="customer-portal-topup"><div className="customer-portal-card-element" ref={cardHost} aria-label="اطلاعات کارت بانکی" />{cardError && <p className="customer-portal-inline-error" role="alert">{cardError}</p>}<div className="customer-portal-topup-actions"><button type="button" className="customer-portal-primary-button" disabled={busy || !cardReady || Boolean(cardError)} onClick={() => void confirmAddCard()}>{busy ? 'در حال ثبت…' : 'ذخیره و انتخاب به‌عنوان پیش‌فرض'}</button><button type="button" className="customer-portal-secondary-button" disabled={busy} onClick={() => setCardPhase('closed')}>انصراف</button></div></div>}
			</section>
		</div>
		<section className="customer-portal-billing-setting-card customer-portal-address-card" aria-labelledby="billing-address-title">
			<div className="customer-portal-panel-heading"><div><p>اطلاعات رسمی حساب</p><h3 id="billing-address-title">نشانی صورتحساب</h3></div>{!editingAddress && <button type="button" onClick={() => setEditingAddress(true)}>ویرایش اطلاعات</button>}</div>
			{!editingAddress && settings ? <p className="customer-portal-billing-address-summary">{[settings.billing_name, settings.address.address, settings.address.city, settings.address.state, settings.address.country, settings.address.postal_code, settings.address.gstin].filter(Boolean).join('، ') || 'اطلاعات صورتحساب ثبت نشده است.'}</p> : <form className="customer-portal-invite-form" onSubmit={event => void submitAddress(event)}>
				<div className="customer-portal-form-columns"><label><span>نام صورتحساب</span><input value={billingName} onChange={event => setBillingName(event.target.value)} required /></label><label><span>کشور</span><select value={address.country} onChange={event => setAddress(current => ({ ...current, country: event.target.value }))} required><option value="">انتخاب کشور</option>{countries.map(country => <option key={country.code} value={country.name}>{country.name}</option>)}</select></label><label><span>نشانی</span><input value={address.address} onChange={event => setAddress(current => ({ ...current, address: event.target.value }))} required /></label><label><span>شهر</span><input value={address.city} onChange={event => setAddress(current => ({ ...current, city: event.target.value }))} required /></label><label><span>استان / منطقه</span><input value={address.state} onChange={event => setAddress(current => ({ ...current, state: event.target.value }))} required /></label><label><span>کد پستی</span><input value={address.postal_code} onChange={event => setAddress(current => ({ ...current, postal_code: event.target.value }))} required /></label>{address.country === 'India' && <label><span>شناسه مالیاتی GSTIN</span><input value={address.gstin === 'Not Applicable' ? '' : address.gstin} onChange={event => setAddress(current => ({ ...current, gstin: event.target.value }))} placeholder="در صورت نداشتن، خالی بگذار" /></label>}</div>
				<div className="customer-portal-card-actions"><button type="submit" className="customer-portal-primary-button" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره اطلاعات صورتحساب'}</button>{hasAddress && <button type="button" className="customer-portal-secondary-button" disabled={busy} onClick={() => { setEditingAddress(false); setAddress({ ...emptyAddress, ...settings?.address }); setBillingName(settings?.billing_name || ''); }}>انصراف</button>}</div>
			</form>}
		</section>
	</section>
	{confirmationDialog}
	</>;
}

function messageOf(error: unknown) { return error instanceof Error ? error.message : 'تنظیمات مالی دریافت نشد؛ دوباره تلاش کن.'; }
