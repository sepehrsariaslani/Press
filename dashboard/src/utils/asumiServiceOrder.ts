type ServiceOrderLike = Record<string, unknown>;

export function getAsumiServiceOrderTitle(order: ServiceOrderLike): string {
	if (order.order_type !== 'Asumi Service') return stringValue(order.plan) || stringValue(order.plan_title) || '—';
	return stringValue(order.service_title) || 'خدمات آسومی';
}

export function getAsumiServiceOrderTomanAmount(order: ServiceOrderLike): number | null {
	if (order.order_type !== 'Asumi Service') return null;
	const value = order.service_amount_toman;
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function getAsumiServiceOrderLines(order: ServiceOrderLike): string[] {
	if (order.order_type !== 'Asumi Service') return [];
	const snapshot = parseSnapshot(order.service_quote_snapshot);
	if (!Array.isArray(snapshot?.lines)) return [];
	return snapshot.lines.flatMap(line => {
		if (!line || typeof line !== 'object' || Array.isArray(line)) return [];
		const title = stringValue((line as Record<string, unknown>).title);
		return title ? [title] : [];
	});
}

export function nextAsumiServiceDeliveryStatus(order: ServiceOrderLike): 'Provisioning' | 'Active' | null {
	if (order.order_type !== 'Asumi Service') return null;
	if (order.status === 'Paid') return 'Provisioning';
	if (order.status === 'Provisioning') return 'Active';
	return null;
}

function parseSnapshot(value: unknown): Record<string, unknown> | null {
	let parsed = value;
	if (typeof value === 'string') {
		try { parsed = JSON.parse(value); } catch { return null; }
	}
	return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}
