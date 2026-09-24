import { useEffect, useRef, useState } from 'react';
import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';
import { createCreditPaymentIntent, getCreditTopUpConstraints } from './portalApi';

type Props = { currency: string; onSuccess: () => void };
type Constraints = { minimum_amount: number; allow_below_minimum: boolean };

export function CreditTopUpPanel({ currency, onSuccess }: Props) {
	const [constraints, setConstraints] = useState<Constraints | null>(null);
	const [amount, setAmount] = useState('');
	const [phase, setPhase] = useState<'amount' | 'card' | 'complete'>('amount');
	const [clientSecret, setClientSecret] = useState('');
	const [publishableKey, setPublishableKey] = useState('');
	const [cardError, setCardError] = useState('');
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [busy, setBusy] = useState(false);
	const [cardReady, setCardReady] = useState(false);
	const [constraintsAttempt, setConstraintsAttempt] = useState(0);
	const stripe = useRef<Stripe | null>(null);
	const card = useRef<StripeCardElement | null>(null);
	const cardHost = useRef<HTMLDivElement | null>(null);
	const numericAmount = Number(amount);
	const amountIsValid = Number.isFinite(numericAmount) && numericAmount > 0;
	const isBelowMinimum = Boolean(
		constraints && !constraints.allow_below_minimum && numericAmount < constraints.minimum_amount,
	);

	useEffect(() => {
		const controller = new AbortController();
		getCreditTopUpConstraints(controller.signal)
			.then(value => { setConstraints(value); setError(''); })
			.catch(caught => {
				if (!controller.signal.aborted) setError(messageOf(caught));
			});
		return () => controller.abort();
	}, [constraintsAttempt]);

	useEffect(() => {
		if (phase !== 'card' || !publishableKey || !cardHost.current) return;
		let active = true;
		setCardReady(false);
		void loadStripe(publishableKey).then(instance => {
			if (!active || !instance || !cardHost.current) return;
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
	}, [phase, publishableKey]);

	async function preparePayment() {
		if (!amountIsValid || isBelowMinimum || !constraints) return;
		setBusy(true);
		setError('');
		try {
			const intent = await createCreditPaymentIntent(numericAmount);
			setClientSecret(intent.client_secret);
			setPublishableKey(intent.publishable_key);
			setPhase('card');
		} catch (caught) {
			setError(messageOf(caught));
		} finally {
			setBusy(false);
		}
	}

	async function confirmPayment() {
		if (!stripe.current || !card.current || !clientSecret) return;
		setBusy(true);
		setError('');
		try {
			const result = await stripe.current.confirmCardPayment(clientSecret, {
				payment_method: { card: card.current },
			});
			if (result.error) {
				setError(result.error.message || 'پرداخت انجام نشد. اطلاعات کارت را بررسی کن.');
				return;
			}
			setNotice('پرداخت ثبت شد؛ پس از تأیید Stripe، اعتبار حساب به‌روزرسانی می‌شود.');
			setPhase('complete');
			onSuccess();
		} catch (caught) {
			setError(messageOf(caught));
		} finally {
			setBusy(false);
		}
	}

	return <section className="customer-portal-topup" aria-labelledby="portal-topup-title">
		<div className="customer-portal-topup-copy"><div><p>شارژ حساب</p><h3 id="portal-topup-title">افزایش اعتبار برای سرویس‌ها</h3></div><span>پرداخت امن با Stripe</span></div>
		{phase === 'complete' ? <div className="customer-portal-inline-status" role="status">{notice}<button type="button" onClick={() => { setPhase('amount'); setAmount(''); setNotice(''); }}>شارژ دوباره</button></div> : <>
			{phase === 'amount' && <>
				<label className="customer-portal-topup-amount"><span>مبلغ شارژ ({currency})</span><input type="number" min="0.01" step={currency === 'INR' ? '1' : '0.01'} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="مبلغ دلخواه" /></label>
				{!constraints && !error && <p className="customer-portal-footnote" role="status">در حال بررسی شرایط پرداخت…</p>}
				{constraints && !constraints.allow_below_minimum && constraints.minimum_amount > 0 && <p className="customer-portal-footnote">برای پرداخت، مبلغ باید دست‌کم {formatCurrency(constraints.minimum_amount, currency)} باشد تا ماندهٔ فاکتورهای باز را پوشش دهد.</p>}
				{currency === 'INR' && <p className="customer-portal-footnote">مالیات GST مطابق تنظیم حساب به مبلغ پرداخت اضافه می‌شود.</p>}
				<button className="customer-portal-primary-button" type="button" onClick={() => void preparePayment()} disabled={busy || !constraints || !amountIsValid || isBelowMinimum}>{busy ? 'در حال آماده‌سازی پرداخت…' : 'ادامه به پرداخت'}</button>
			</>}
			{phase === 'card' && <>
				<p className="customer-portal-topup-total">مبلغ پرداخت: <strong>{formatCurrency(numericAmount, currency)}</strong></p>
				<div className="customer-portal-card-element" ref={cardHost} aria-label="اطلاعات کارت بانکی" />
				{cardError && <p className="customer-portal-inline-error" role="alert">{cardError}</p>}
				<div className="customer-portal-topup-actions"><button className="customer-portal-primary-button" type="button" onClick={() => void confirmPayment()} disabled={busy || !cardReady || Boolean(cardError)}>{busy ? 'در حال پرداخت…' : 'پرداخت و افزایش اعتبار'}</button><button className="customer-portal-secondary-button" type="button" onClick={() => { setPhase('amount'); setError(''); }} disabled={busy}>ویرایش مبلغ</button></div>
			</>}
		</>}
		{error && <div className="customer-portal-inline-error" role="alert"><span>{error}</span>{!constraints && <button type="button" onClick={() => { setError(''); setConstraintsAttempt(value => value + 1); }}>تلاش دوباره</button>}</div>}
	</section>;
}

function formatCurrency(value: number, currency: string) {
	try { return new Intl.NumberFormat('fa-IR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
	catch { return `${new Intl.NumberFormat('fa-IR').format(value)} ${currency}`; }
}

function messageOf(error: unknown) {
	return error instanceof Error ? error.message : 'آماده‌سازی پرداخت ممکن نشد.';
}
