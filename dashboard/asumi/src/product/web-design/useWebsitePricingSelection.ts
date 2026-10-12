import { useEffect, useMemo, useState } from 'react';
import {
	monthlyAddons,
	monthlyServices,
	websiteAddons,
	websiteTiers,
	type MonthlyService,
	type WebsiteAddon,
	type WebsiteTier,
	type WebsiteTierId,
} from './catalog';
import { estimateWebsiteSelection, formatToman, quoteRange, type QuantitySelection } from './estimator';

const storageKey = 'asumi-website-design-estimate-v1';
const tierIds = new Set<WebsiteTierId>(['simple', 'medium', 'advanced']);

type PersistedSelection = { tierId: WebsiteTierId; addons: QuantitySelection; recurring: QuantitySelection };

function readSelection(): PersistedSelection {
	try {
		const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null') as Partial<PersistedSelection> | null;
		return {
			tierId: saved?.tierId && tierIds.has(saved.tierId) ? saved.tierId : 'simple',
			addons: saved?.addons && typeof saved.addons === 'object' ? saved.addons : {},
			recurring: saved?.recurring && typeof saved.recurring === 'object' ? saved.recurring : {},
		};
	} catch {
		return { tierId: 'simple', addons: {}, recurring: {} };
	}
}

function keepAddonsAvailableForTier(selection: QuantitySelection, tierId: WebsiteTierId) {
	const compatible = Object.fromEntries(Object.entries(selection).filter(([code, count]) => {
		const item = websiteAddons.find(addon => addon.code === code);
		return count > 0 && Boolean(item && !item.blockedReason && item.availableTiers.includes(tierId));
	}));
	let removedPrerequisite = true;
	while (removedPrerequisite) {
		removedPrerequisite = false;
		for (const item of websiteAddons) {
			if (compatible[item.code] && item.requires?.some(code => !compatible[code])) {
				delete compatible[item.code];
				removedPrerequisite = true;
			}
		}
	}
	return compatible;
}

function dependencyNames(codes: string[]) {
	return codes.map(code => websiteAddons.find(item => item.code === code)?.name || code).join('، ');
}

function positiveCount(selection: QuantitySelection, code: string) {
	return Math.max(0, Math.min(99, Math.floor(Number(selection[code]) || 0)));
}

export function useWebsitePricingSelection() {
	const [initial] = useState(readSelection);
	const [tierId, setTierId] = useState(initial.tierId);
	const [addons, setAddons] = useState<QuantitySelection>(initial.addons);
	const [recurring, setRecurring] = useState<QuantitySelection>(initial.recurring);
	const [category, setCategory] = useState('همه');
	const [query, setQuery] = useState('');
	const [status, setStatus] = useState('انتخاب‌هایت را تغییر بده؛ مبلغ‌ها همان‌جا به‌روز می‌شوند.');
	const [copyText, setCopyText] = useState('');
	const selectedTier = websiteTiers.find(tier => tier.id === tierId) || websiteTiers[0];
	const estimate = useMemo(() => estimateWebsiteSelection(tierId, addons, recurring), [tierId, addons, recurring]);
	const selectedAddonIds = useMemo(() => new Set(Object.entries(addons).filter(([, count]) => count > 0).map(([code]) => code)), [addons]);
	const selectedRecurringIds = useMemo(() => new Set(Object.entries(recurring).filter(([, count]) => count > 0).map(([code]) => code)), [recurring]);
	const normalizedQuery = query.trim().toLocaleLowerCase('fa-IR');
	const visibleAddons = websiteAddons.filter(item => (category === 'همه' || item.category === category)
		&& (!normalizedQuery || `${item.code} ${item.name} ${item.description}`.toLocaleLowerCase('fa-IR').includes(normalizedQuery)));
	const selectedNames = [
		...websiteAddons.filter(item => selectedAddonIds.has(item.code)).map(item => `${item.name}${addons[item.code] > 1 ? ` × ${addons[item.code]}` : ''}`),
		...[...monthlyServices, ...monthlyAddons].filter(item => selectedRecurringIds.has(item.code)).map(item => `${item.name}${recurring[item.code] > 1 ? ` × ${recurring[item.code]}` : ''}`),
	];

	useEffect(() => {
		try { window.localStorage.setItem(storageKey, JSON.stringify({ tierId, addons, recurring } satisfies PersistedSelection)); }
		catch { /* The estimate remains usable if browser storage is unavailable. */ }
	}, [tierId, addons, recurring]);

	function addAddonDependencies(item: WebsiteAddon, next: QuantitySelection, forTier: WebsiteTierId) {
		for (const code of item.requires || []) {
			if (next[code]) continue;
			const prerequisite = websiteAddons.find(candidate => candidate.code === code);
			if (prerequisite && !prerequisite.blockedReason && prerequisite.availableTiers.includes(forTier)) next[code] = 1;
		}
	}

	function changeTier(nextTier: WebsiteTier) {
		const compatible = keepAddonsAvailableForTier(addons, nextTier.id);
		setTierId(nextTier.id);
		setAddons(compatible);
		setStatus(Object.keys(compatible).length < Object.keys(addons).length
			? `بسته‌ی ${nextTier.name} انتخاب شد؛ افزونه‌هایی که در این سطح ارائه نمی‌شوند از برآورد کنار گذاشته شدند.`
			: `بسته‌ی ${nextTier.name} انتخاب شد؛ قیمت پایه و قابلیت‌های مجاز به‌روز شدند.`);
	}

	function setAddonQuantity(code: string, nextCount: number) {
		setAddons(current => {
			const next = { ...current };
			if (nextCount > 0) next[code] = Math.min(99, nextCount);
			else delete next[code];
			return next;
		});
	}

	function toggleAddon(item: WebsiteAddon) {
		if (item.blockedReason) {
			setStatus(`${item.code}: ${item.blockedReason}`);
			return;
		}
		if (!item.availableTiers.includes(tierId)) {
			const suggestedTier = websiteTiers.find(tier => item.availableTiers.includes(tier.id));
			if (!suggestedTier) return;
			setTierId(suggestedTier.id);
			setAddons(current => {
				const next = keepAddonsAvailableForTier(current, suggestedTier.id);
				addAddonDependencies(item, next, suggestedTier.id);
				next[item.code] = 1;
				return next;
			});
			setStatus(`بسته‌ی ${suggestedTier.name} برای این قابلیت لازم است؛ بسته عوض شد و ${item.name} اضافه شد.`);
			return;
		}
		if (!Object.hasOwn(addons, item.code)) {
			setAddons(current => {
				const next = { ...current };
				addAddonDependencies(item, next, tierId);
				next[item.code] = 1;
				return next;
			});
			setStatus(item.requires?.length ? `پیش‌نیاز ${dependencyNames(item.requires)} هم به‌طور خودکار اضافه شد.` : `${item.name} به برآورد اضافه شد.`);
			return;
		}
		const dependentAddons = websiteAddons.filter(candidate => positiveCount(addons, candidate.code) > 0 && candidate.requires?.includes(item.code));
		const dependentServices = [...monthlyServices, ...monthlyAddons].filter(candidate => positiveCount(recurring, candidate.code) > 0
			&& (candidate.requires?.includes(item.code)
				|| (candidate.requiresAny?.includes(item.code) && candidate.requiresAny.filter(code => selectedAddonIds.has(code)).length === 1)));
		if (dependentAddons.length || dependentServices.length) {
			const names = [...dependentAddons.map(candidate => candidate.name), ...dependentServices.map(candidate => candidate.name)];
			setStatus(`برای حذف ${item.name}، ابتدا وابسته‌ها را بردار: ${names.join('، ')}.`);
			return;
		}
		setAddonQuantity(item.code, 0);
		setStatus(`${item.name} از برآورد حذف شد.`);
	}

	function changeAddonCount(item: WebsiteAddon, delta: number) {
		const nextCount = positiveCount(addons, item.code) + delta;
		if (nextCount <= 0) {
			toggleAddon(item);
			return;
		}
		setAddonQuantity(item.code, nextCount);
		setStatus(`تعداد ${item.name} به ${nextCount} تغییر کرد.`);
	}

	function toggleRecurring(item: MonthlyService) {
		if (item.blockedReason) {
			setStatus(`${item.code}: ${item.blockedReason}`);
			return;
		}
		if (item.requiresAny?.length && !item.requiresAny.some(code => selectedAddonIds.has(code))) {
			setStatus('برای پشتیبانی ربات، اول یکی از ربات‌های تلگرام یا بله را در افزونه‌ها اضافه کن.');
			return;
		}
		if (item.code === 'A57' && !['M01', 'M02', 'M03', 'M04'].some(code => selectedRecurringIds.has(code))) {
			setStatus('بسته‌ی ۱۰ مقاله، افزودنی پلن SEO است؛ ابتدا پلن SEO پایه یا حرفه‌ای را انتخاب کن.');
			return;
		}
		if (item.code === 'A57' && (selectedRecurringIds.has('M02') || selectedRecurringIds.has('M04'))) {
			setStatus('بسته‌های SEO همراه با ۱۰ مقاله، محتوای A57 را هم شامل می‌شوند؛ انتخاب تکراری انجام نشد.');
			return;
		}
		if (selectedRecurringIds.has(item.code)) {
			setRecurring(current => {
				const next = { ...current };
				delete next[item.code];
				return next;
			});
			setStatus(`${item.name} از هزینه‌ی ماهانه حذف شد.`);
			return;
		}
		setRecurring(current => {
			const next = { ...current };
			if (item.exclusiveGroup) {
				for (const other of monthlyServices.filter(candidate => candidate.exclusiveGroup === item.exclusiveGroup)) delete next[other.code];
			}
			if (item.code === 'M02' || item.code === 'M04') delete next.A57;
			next[item.code] = 1;
			return next;
		});
		setAddons(current => {
			const next = { ...current };
			for (const code of item.requires || []) {
				const prerequisite = websiteAddons.find(candidate => candidate.code === code);
				if (prerequisite && !prerequisite.blockedReason && prerequisite.availableTiers.includes(tierId)) next[code] = 1;
			}
			return next;
		});
		setStatus(item.requires?.length ? `پیش‌نیاز ${dependencyNames(item.requires)} هم به‌طور خودکار افزوده شد.` : `${item.name} به هزینه‌ی ماهانه اضافه شد.`);
	}

	function changeRecurringCount(item: MonthlyService, delta: number) {
		const nextCount = positiveCount(recurring, item.code) + delta;
		if (nextCount <= 0) {
			toggleRecurring(item);
			return;
		}
		setRecurring(current => ({ ...current, [item.code]: nextCount }));
		setStatus(`تعداد ${item.name} به ${nextCount} تغییر کرد.`);
	}

	function makeQuote() {
		return [
			`پیش‌برآورد طراحی سایت آسومی — بسته‌ی ${selectedTier.name}`,
			`قیمت پایه: ${formatToman(selectedTier.price)}`,
			`هزینه‌ی راه‌اندازی: ${quoteRange(estimate.setupMin, estimate.setupMax)}`,
			`خدمات ماهانه: ${quoteRange(estimate.monthlyMin, estimate.monthlyMax)}`,
			`جمع ماه اول: ${quoteRange(estimate.firstMonthMin, estimate.firstMonthMax)}`,
			`برآورد سال اول با تداوم خدمات ماهانه: ${quoteRange(estimate.yearOneMin, estimate.yearOneMax)}`,
			`انتخاب‌ها: ${selectedNames.length ? selectedNames.join('، ') : 'بدون افزونه'}`,
			...(estimate.marketRateCount ? ['هزینه‌ی سرور مجازی، دامنه و سرویس‌های ثالث با نرخ روز جدا محاسبه می‌شود.'] : []),
			'این ارقام پیش‌برآوردند و مبلغ نهایی بعد از بررسی محدوده‌ی پروژه تأیید می‌شود.',
		].join('\n');
	}

	async function copyEstimate() {
	const text = makeQuote();
		setCopyText(text);
		try {
			await navigator.clipboard.writeText(text);
			setStatus('خلاصه‌ی برآورد کپی شد؛ می‌توانی آن را برای مشتری یا مشاور بفرستی.');
		} catch {
			setStatus('خلاصه‌ی برآورد آماده است؛ متن پایین را انتخاب و کپی کن.');
		}
	}

	function clearSelection() {
		setTierId('simple');
		setAddons({});
		setRecurring({});
		setCopyText('');
		setStatus('انتخاب‌ها پاک شدند و برآورد با بسته‌ی ساده شروع شد.');
	}

	return {
		tierId, selectedTier, addons, recurring, category, query, status, copyText, estimate,
		selectedAddonIds, selectedRecurringIds, visibleAddons, selectedNames,
		setCategory, setQuery, changeTier, toggleAddon, changeAddonCount, toggleRecurring,
		changeRecurringCount, copyEstimate, clearSelection,
	};
}
