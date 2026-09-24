export type PortalSite = {
	name: string;
	label: string;
	status: string;
	plan_title: string | null;
	plan_price: number | null;
	plan_interval: string | null;
};

export type PortalPlan = {
	name: string;
	title: string;
	price_inr: number | null;
	price_usd: number | null;
	interval?: string | null;
	enabled?: boolean | number;
	features: string[];
};

export type PortalSubscription = {
	name: string;
	app: string;
	app_title: string;
	app_image: string | null;
	site: string | null;
	site_label: string | null;
	site_status: string | null;
	status: string;
	payment_status?: string | null;
	pending_invoice?: string | null;
	interval: string | null;
	plan_interval?: string | null;
	billing_period_mismatch?: boolean;
	start_date: string | null;
	end_date: string | null;
	selected_plan: PortalPlan | null;
};

export type MarketplaceApp = {
	name: string;
	app: string;
	team: string;
	title: string;
	image: string | null;
	description: string | null;
	categories: string[];
	plans: PortalPlan[];
};

export type AppInstallOption = {
	app: string;
	title: string;
	app_title: string;
	team?: string;
	has_plans_available?: boolean;
	plans?: PortalPlan[];
	[billing_type: string]: unknown;
};

export type InstalledApp = AppInstallOption & {
	subscription?: { name?: string; plan?: string };
};

export type SupportRequest = {
	name: string;
	team: string;
	site: string | null;
	subject: string;
	category: string;
	message: string;
	status: string;
	resolution: string | null;
	creation: string;
	modified: string;
	messages?: Array<{ name: string; comment_by: string; content: string; creation: string }>;
};

export type CustomerPortalData = {
	team: { name: string; title: string; currency: string };
	teams: Array<{ name: string; title: string }>;
	sites: PortalSite[];
	included_module_ids: string[];
	subscriptions: PortalSubscription[];
	can_manage_catalog: boolean;
	can_manage_support: boolean;
	can_manage_billing: boolean;
	can_manage_apps: boolean;
};

export type SiteAppState = { installed: InstalledApp[]; available: AppInstallOption[] };
export type Invoice = {
	name: string;
	total: number;
	amount_due: number;
	amount_due_with_tax?: number;
	status: string;
	type: string;
	stripe_invoice_url: string | null;
	period_start: string | null;
	period_end: string | null;
	due_date: string | null;
	payment_date: string | null;
	currency: string;
	invoice_pdf: string | null;
	date: string | null;
	formatted_total?: string;
	formatted_amount_due?: string;
	stripe_link_expired?: boolean;
};

export type BillingAddress = {
	address: string;
	city: string;
	state: string;
	postal_code: string;
	country: string;
	gstin: string;
};

export type BillingSettings = {
	billing_name: string;
	address: BillingAddress;
	payment_mode: string | null;
	billing_country_code: string | null;
};

export type PaymentMethod = {
	name: string;
	last_4: string;
	name_on_card: string;
	expiry_month: number;
	expiry_year: number;
	brand: string;
	is_default: boolean | number;
};

export type BalanceTransaction = {
	name: string;
	creation: string;
	amount: number;
	currency: string;
	source: string;
	type: string;
	ending_balance: number;
	description: string | null;
	formatted?: { amount: string; ending_balance: string; invoice_for?: string };
};

export type TeamMember = {
	user: string;
	email: string;
	user_name: string;
	user_image?: string | null;
	roles: Array<{ name: string; title: string; admin_access: boolean; allow_apps: boolean; allow_billing: boolean }>;
	has_admin_access?: boolean;
	status?: string;
};

export type TeamAccessData = {
	team: { name: string; title: string };
	members: TeamMember[];
	invitations: Array<{ name: string; email: string; date: string; press_role: string | null; status: string }>;
	roles: Array<{ name: string; title: string; admin_access: boolean }>;
	can_manage_members: boolean;
};

type FrappeResponse<T> = {
	message?: T;
	exc?: string;
	exception?: string;
	_error_message?: string;
	_server_messages?: string;
};

type RequestOptions = { method?: 'GET' | 'POST'; params?: Record<string, unknown>; signal?: AbortSignal };

declare global {
	interface Window {
		csrf_token?: string;
		frappe?: { csrf_token?: string };
	}
}

export async function getCustomerPortalData(signal?: AbortSignal) {
	return frappeCall<CustomerPortalData>('press.api.customer_portal.dashboard', { signal });
}

export async function getMarketplaceCatalog(signal?: AbortSignal) {
	return frappeCall<{ apps: MarketplaceApp[]; mappings: Array<{ module_id: string; mode: string; description: string | null; published: number; prerequisites: string[]; marketplace_app_slug: string | null; marketplace_app_title: string | null }>; hidden_module_ids: string[] }>(
		'press.api.customer_portal.catalog', { signal },
	);
}

export async function getSiteAppState(site: string, signal?: AbortSignal): Promise<SiteAppState> {
	return frappeCall<SiteAppState>('press.api.customer_portal.site_app_state', { params: { name: site }, signal });
}

export async function installMarketplaceApp(site: string, app: string, plan?: string) {
	return frappeCall<string | null>('press.api.customer_portal.install_marketplace_app', {
		method: 'POST',
		params: { name: site, app, plan },
	});
}

export async function uninstallMarketplaceApp(site: string, app: string) {
	return frappeCall<string>('press.api.customer_portal.uninstall_marketplace_app', {
		method: 'POST', params: { name: site, app },
	});
}

export async function changeMarketplacePlan(subscription: string, newPlan: string) {
	return frappeCall<void>('press.api.customer_portal.change_marketplace_plan', {
		method: 'POST', params: { subscription, new_plan: newPlan },
	});
}

export async function getInstallHistory(site: string, signal?: AbortSignal) {
	return frappeCall<Array<{ name: string; app: string; app_title: string | null; action: string; job: string | null; status: string; creation: string }>>(
		'press.api.customer_portal.installation_history', { params: { name: site }, signal },
	);
}

export async function getInstallStatus(site: string, job: string) {
	return frappeCall<{ name: string; status: string; start: string | null; end: string | null }>(
		'press.api.customer_portal.installation_status', { params: { name: site, job } },
	);
}

export async function getInvoices(signal?: AbortSignal) {
	return frappeCall<Invoice[]>('press.api.billing.invoices_and_payments', { signal });
}

export async function refreshInvoicePaymentLink(invoice: string) {
	return frappeCall<string>('press.api.asumi_billing.refresh_invoice_payment_link', { method: 'POST', params: { invoice } });
}

export async function getUpcomingInvoice(signal?: AbortSignal) {
	return frappeCall<{ upcoming_invoice: Invoice | null; available_credits: string }>(
		'press.api.billing.upcoming_invoice', { signal },
	);
}

export async function getBillingSettings(signal?: AbortSignal) {
	return frappeCall<BillingSettings>('press.api.asumi_billing.billing_settings', { signal });
}

export async function saveBillingDetails(billing_name: string, address: BillingAddress) {
	const details = address.country === 'India' && !address.gstin.trim() ? { ...address, gstin: 'Not Applicable' } : address;
	return frappeCall<BillingSettings>('press.api.asumi_billing.save_billing_details', {
		method: 'POST', params: { billing_details: { ...details, billing_name } },
	});
}

export async function getCountries(signal?: AbortSignal) {
	return frappeCall<Array<{ name: string; code: string }>>('press.api.account.country_list', { signal });
}

export async function getPaymentMethods(signal?: AbortSignal) {
	return frappeCall<PaymentMethod[]>('press.api.billing.get_payment_methods', { signal });
}

export async function getCardSetupIntent() {
	return frappeCall<{ publishable_key: string; setup_intent: { client_secret: string } }>(
		'press.api.billing.get_publishable_key_and_setup_intent',
	);
}

export async function finishCardSetup(setup_intent: unknown) {
	return frappeCall<{ payment_method_name: string }>('press.api.billing.setup_intent_success', {
		method: 'POST', params: { setup_intent },
	});
}

export async function setDefaultPaymentMethod(name: string) {
	return frappeCall<void>('press.api.billing.set_as_default', { method: 'POST', params: { name } });
}

export async function removePaymentMethod(name: string) {
	return frappeCall<string | null>('press.api.billing.remove_payment_method', { method: 'POST', params: { name } });
}

export async function changePaymentMode(mode: string) {
	return frappeCall<void>('press.api.billing.change_payment_mode', { method: 'POST', params: { mode } });
}

export async function getBalanceTransactions(signal?: AbortSignal) {
	return frappeCall<BalanceTransaction[]>('press.api.billing.balances', { signal });
}

export async function getCreditTopUpConstraints(signal?: AbortSignal) {
	return frappeCall<{ currency: string; minimum_amount: number; allow_below_minimum: boolean }>(
		'press.api.customer_portal.credit_topup_constraints', { signal },
	);
}

export async function createCreditPaymentIntent(amount: number) {
	return frappeCall<{ client_secret: string; publishable_key: string }>(
		'press.api.billing.create_payment_intent_for_buying_credits', { method: 'POST', params: { amount } },
	);
}

export async function getTeamAccess(signal?: AbortSignal) {
	return frappeCall<TeamAccessData>('press.api.customer_portal.team_access', { signal });
}

export async function inviteTeamMember(email: string, role?: string) {
	return frappeCall<{ email: string; status: string }>('press.api.customer_portal.invite_team_member', {
		method: 'POST', params: { email, role },
	});
}

export async function cancelTeamInvitation(email: string) {
	return frappeCall<{ email: string; status: string }>('press.api.customer_portal.cancel_team_invitation', {
		method: 'POST', params: { email },
	});
}

export async function removeTeamMember(email: string) {
	return frappeCall<{ email: string; status: string }>('press.api.customer_portal.remove_team_member', {
		method: 'POST', params: { email },
	});
}

export async function updateTeamMemberRoles(email: string, roles: string[]) {
	return frappeCall<{ email: string; roles: string[]; status: string }>('press.api.customer_portal.update_team_member_roles', {
		method: 'POST', params: { email, roles },
	});
}

export async function getSupportRequests(signal?: AbortSignal) {
	return frappeCall<SupportRequest[]>('press.api.customer_portal.support_requests', { signal });
}

export async function getSupportRequest(name: string, signal?: AbortSignal) {
	return frappeCall<SupportRequest>('press.api.customer_portal.support_request_detail', { params: { name }, signal });
}

export async function createSupportRequest(params: { subject: string; message: string; category: string; site?: string }) {
	return frappeCall<SupportRequest>('press.api.customer_portal.create_support_request', { method: 'POST', params });
}

export async function replySupportRequest(name: string, message: string) {
	return frappeCall<SupportRequest>('press.api.customer_portal.reply_support_request', { method: 'POST', params: { name, message } });
}

export async function getCatalogAdmin(signal?: AbortSignal) {
	return frappeCall<{ apps: MarketplaceApp[]; mappings: Array<{ module_id: string; mode: string; marketplace_app: string | null; published: number; description: string | null; prerequisites: string[] }> }>(
		'press.api.customer_portal.catalog_admin', { signal },
	);
}

export async function saveCatalogMapping(params: { module_id: string; mode: string; marketplace_app?: string; published: boolean; description: string; prerequisites: string[] }) {
	return frappeCall('press.api.customer_portal.save_catalog_mapping', { method: 'POST', params: { ...params, prerequisites: JSON.stringify(params.prerequisites) } });
}

export async function updateMarketplacePlanPrices(params: { plan: string; price_inr: string; price_usd: string }) {
	return frappeCall('press.api.customer_portal.update_marketplace_plan_prices', { method: 'POST', params });
}

export async function getAdminSupportRequests(signal?: AbortSignal) {
	return frappeCall<Array<SupportRequest & { team: string }>>('press.api.customer_portal.admin_support_requests', { signal });
}

export async function updateAdminSupportRequest(params: { name: string; status: string; response?: string }) {
	return frappeCall('press.api.customer_portal.admin_update_support_request', { method: 'POST', params });
}

async function frappeCall<T>(method: string, options: RequestOptions = {}): Promise<T> {
	const httpMethod = options.method || 'GET';
	const url = new URL(`/api/method/${method}`, window.location.origin);
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'X-Frappe-Site-Name': window.location.hostname,
	};
	const activeTeam = window.localStorage.getItem('current_team');
	if (activeTeam) headers['X-Press-Team'] = activeTeam;
	if (httpMethod === 'POST') {
		headers['Content-Type'] = 'application/json; charset=utf-8';
		const csrfToken = window.csrf_token || window.frappe?.csrf_token;
		if (csrfToken && csrfToken !== '{{ csrf_token }}') headers['X-Frappe-CSRF-Token'] = csrfToken;
	}
	if (httpMethod === 'GET') {
		for (const [key, value] of Object.entries(options.params || {})) {
			if (value === undefined || value === null || value === '') continue;
			url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value));
		}
	}
	let response: Response;
	try {
		response = await fetch(url, {
			method: httpMethod,
			credentials: 'same-origin',
			headers,
			body: httpMethod === 'POST' ? JSON.stringify(options.params || {}) : undefined,
			signal: options.signal,
		});
	} catch (caught) {
		if (options.signal?.aborted || (caught instanceof DOMException && caught.name === 'AbortError')) throw caught;
		throw new Error('ارتباط با سرویس برقرار نشد. اتصال را بررسی کن و دوباره تلاش کن.');
	}
	let payload: FrappeResponse<T>;
	try {
		payload = await response.json() as FrappeResponse<T>;
	} catch {
		throw new Error('پاسخ سرویس دریافت نشد. کمی بعد دوباره تلاش کن.');
	}
	if (!response.ok || payload.exc || payload.exception || payload.message === undefined) {
		throw new Error(errorMessage(payload, response.status));
	}
	return payload.message;
}

function errorMessage(payload: FrappeResponse<unknown>, status: number) {
	let message = '';
	if (payload._server_messages) {
		try {
			const messages = JSON.parse(payload._server_messages) as string[];
			message = messages.map(item => {
				try { return JSON.parse(item).message as string; } catch { return item; }
			}).filter(Boolean).join(' ');
		} catch { /* Use the generic response below. */ }
	}
	message ||= payload._error_message || '';
	const normalized = message.toLocaleLowerCase();
	if (status === 401 || /not logged in|login required|session expired/.test(normalized)) return 'برای ادامه وارد حساب آسومی شو.';
	if (/available credits|add credits|free credits|cannot install a paid app|paid app.*credit/.test(normalized)) return 'برای خرید این پلن، مدیر مالی باید روش پرداخت را تنظیم یا اعتبار حساب را افزایش دهد.';
	if (/billing currency|currency.*plan|not available.*currency|quote/.test(normalized)) return 'این پلن برای ارز حساب قابل خرید نیست؛ برای دریافت تعرفه با پشتیبانی آسومی تماس بگیر.';
	if (/billing period|payment period|usage record|billing interval/.test(normalized)) return 'تغییر دورهٔ پرداخت به بررسی تیم پشتیبانی نیاز دارد.';
	if (/choose an app plan|choose an enabled plan|choose a valid plan/.test(normalized)) return 'یک پلن معتبر برای این افزونه انتخاب کن.';
	if (/not available for the selected site|not compatible|site.*installable/.test(normalized)) return 'این افزونه با نسخه یا وضعیت سایت انتخاب‌شده سازگار نیست.';
	if (/does not belong to the current team|does not belong to this team|not permitted|permission/.test(normalized) || status === 403) return 'برای این کار دسترسی لازم را نداری؛ از مدیر تیم کمک بگیر.';
	if (/only a team billing manager/.test(normalized)) return 'برای این کار باید مدیر مالی تیم اقدام کند.';
	if (/stripe|payment link|invoice|payment/.test(normalized)) return 'پرداخت یا دریافت فاکتور کامل نشد؛ وضعیت را دوباره بررسی کن یا با پشتیبانی در تماس باش.';
	if (/[\u0600-\u06ff]/.test(message) && message.length <= 200) return message;
	return 'انجام درخواست ممکن نشد. دوباره تلاش کن یا از پشتیبانی کمک بگیر.';
}
