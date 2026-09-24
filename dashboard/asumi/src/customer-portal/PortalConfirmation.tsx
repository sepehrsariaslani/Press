import { useCallback, useEffect, useId, useRef, useState } from 'react';

type ConfirmationRequest = {
	title: string;
	description: string;
	details?: string[];
	note?: string;
	confirmLabel?: string;
	appearance?: 'primary' | 'danger';
};

export function usePortalConfirmation() {
	const [request, setRequest] = useState<ConfirmationRequest | null>(null);
	const resolver = useRef<((approved: boolean) => void) | null>(null);

	const confirm = useCallback((next: ConfirmationRequest) => new Promise<boolean>(resolve => {
		resolver.current?.(false);
		resolver.current = resolve;
		setRequest(next);
	}), []);

	const resolve = useCallback((approved: boolean) => {
		const finish = resolver.current;
		resolver.current = null;
		setRequest(null);
		finish?.(approved);
	}, []);

	return {
		confirm,
		dialog: <ConfirmationDialog request={request} onResolve={resolve} />,
	};
}

function ConfirmationDialog({ request, onResolve }: { request: ConfirmationRequest | null; onResolve: (approved: boolean) => void }) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	const detailsId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (request && !dialog.open) dialog.showModal();
		if (!request && dialog.open) dialog.close();
	}, [request]);

	return <dialog
		ref={dialogRef}
		className="customer-portal-confirmation"
		dir="rtl"
		aria-labelledby={titleId}
		aria-describedby={request?.details?.length ? `${descriptionId} ${detailsId}` : descriptionId}
		onCancel={event => { event.preventDefault(); onResolve(false); }}
		onClick={event => { if (event.target === event.currentTarget) onResolve(false); }}
	>
		{request && <div className="customer-portal-confirmation-content">
			<p className="customer-portal-confirmation-eyebrow">تأیید در پنل آسومی</p>
			<h2 id={titleId}>{request.title}</h2>
			<p id={descriptionId}>{request.description}</p>
			{request.details?.length ? <ul id={detailsId} className="customer-portal-confirmation-details">{request.details.map((detail, index) => <li key={`${index}:${detail}`}>{detail}</li>)}</ul> : null}
			{request.note && <p className="customer-portal-confirmation-note">{request.note}</p>}
			<div className="customer-portal-confirmation-actions">
				<button type="button" className={request.appearance === 'danger' ? 'customer-portal-danger-button' : 'customer-portal-primary-button'} onClick={() => onResolve(true)}>{request.confirmLabel || 'تأیید'}</button>
				<button type="button" className="customer-portal-secondary-button" autoFocus onClick={() => onResolve(false)}>بازگشت</button>
			</div>
		</div>}
	</dialog>;
}
