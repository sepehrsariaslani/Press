import dayjs, { dayjsLocal } from './dayjs';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

const JALALI_MONTHS = [
	'فروردین',
	'اردیبهشت',
	'خرداد',
	'تیر',
	'مرداد',
	'شهریور',
	'مهر',
	'آبان',
	'آذر',
	'دی',
	'بهمن',
	'اسفند',
];

const JALALI_MONTHS_SHORT = [
	'فرو',
	'ارد',
	'خرد',
	'تیر',
	'مرد',
	'شهر',
	'مهر',
	'آبا',
	'آذر',
	'دی',
	'بهم',
	'اسف',
];

// JS getUTCDay() => 0: Sunday ... 6: Saturday
const WEEKDAY_NAMES = [
	'یکشنبه',
	'دوشنبه',
	'سه شنبه',
	'چهارشنبه',
	'پنجشنبه',
	'جمعه',
	'شنبه',
];

const WEEKDAY_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

const WEEK_HEADER_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const jalaliPartsFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	timeZone: 'UTC',
});

const gregorianFromJalaliCache = new Map();

export function toPersianDigits(value) {
	return String(value ?? '').replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function toEnglishDigits(value) {
	if (value == null) return '';
	let normalized = String(value);
	PERSIAN_DIGITS.forEach((digit, index) => {
		normalized = normalized.replaceAll(digit, String(index));
	});
	ARABIC_DIGITS.forEach((digit, index) => {
		normalized = normalized.replaceAll(digit, String(index));
	});
	return normalized;
}

export function getJalaliMonthNames() {
	return JALALI_MONTHS;
}

export function getJalaliWeekHeader() {
	return WEEK_HEADER_SHORT;
}

export function getJalaliPartsFromGregorian(value) {
	let date = toUtcDate(value);
	if (!date) return null;

	return getJalaliPartsFromUtcDate(date);
}

function getJalaliPartsFromUtcDate(date) {
	let year;
	let month;
	let day;

	for (let part of jalaliPartsFormatter.formatToParts(date)) {
		if (part.type === 'year') year = Number(part.value);
		if (part.type === 'month') month = Number(part.value);
		if (part.type === 'day') day = Number(part.value);
	}

	if (!year || !month || !day) return null;

	let weekdayIndex = date.getUTCDay();
	return {
		year,
		month,
		day,
		monthName: JALALI_MONTHS[month - 1],
		monthShortName: JALALI_MONTHS_SHORT[month - 1],
		weekdayName: WEEKDAY_NAMES[weekdayIndex],
		weekdayShortName: WEEKDAY_SHORT[weekdayIndex],
	};
}

function toUtcDate(value) {
	if (value == null || value === '') return null;

	let parsed = dayjs(value);
	if (!parsed.isValid()) return null;

	return new Date(Date.UTC(parsed.year(), parsed.month(), parsed.date()));
}

function toDateTime(value) {
	if (value == null || value === '') return null;
	let parsed = dayjs(value);
	if (!parsed.isValid()) return null;
	return parsed;
}

function formatUtcDate(date) {
	let year = date.getUTCFullYear();
	let month = String(date.getUTCMonth() + 1).padStart(2, '0');
	let day = String(date.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function addUtcDays(date, days) {
	return new Date(date.getTime() + days * MS_IN_DAY);
}

export function jalaliToGregorianDateString(year, month, day) {
	let cacheKey = `${year}-${month}-${day}`;
	if (gregorianFromJalaliCache.has(cacheKey)) {
		return gregorianFromJalaliCache.get(cacheKey);
	}

	let startYear = Number(year) + 620;
	let start = new Date(Date.UTC(startYear - 1, 0, 1));

	for (let i = 0; i < 1200; i++) {
		let cursor = addUtcDays(start, i);
		let parts = getJalaliPartsFromUtcDate(cursor);
		if (!parts) continue;

		if (
			parts.year === Number(year) &&
			parts.month === Number(month) &&
			parts.day === Number(day)
		) {
			let gregorian = formatUtcDate(cursor);
			gregorianFromJalaliCache.set(cacheKey, gregorian);
			return gregorian;
		}
	}

	return null;
}

export function parseJalaliDateInput(value) {
	if (value == null) return null;

	let normalized = toEnglishDigits(String(value).trim());
	if (!normalized) return null;

	let match = normalized.match(/^(\d{3,4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
	if (match) {
		let [, year, month, day] = match;
		let jy = Number(year);
		let jm = Number(month);
		let jd = Number(day);
		if (jy >= 1200 && jy <= 1700 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
			return jalaliToGregorianDateString(jy, jm, jd);
		}
	}

	let parsed = dayjs(normalized);
	if (!parsed.isValid()) return null;
	return parsed.format('YYYY-MM-DD');
}

export function parseJalaliDateTimeInput(value) {
	if (value == null) return null;

	let normalized = toEnglishDigits(String(value).trim());
	if (!normalized) return null;

	let match = normalized.match(
		/^(\d{3,4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/,
	);

	if (match) {
		let [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
		let jy = Number(year);
		let jm = Number(month);
		let jd = Number(day);
		let hh = Number(hour);
		let mm = Number(minute);
		let ss = Number(second);

		if (
			jy >= 1200 &&
			jy <= 1700 &&
			jm >= 1 &&
			jm <= 12 &&
			jd >= 1 &&
			jd <= 31 &&
			hh >= 0 &&
			hh <= 23 &&
			mm >= 0 &&
			mm <= 59 &&
			ss >= 0 &&
			ss <= 59
		) {
			let gregorian = jalaliToGregorianDateString(jy, jm, jd);
			if (!gregorian) return null;
			return `${gregorian} ${String(hh).padStart(2, '0')}:${String(mm).padStart(
				2,
				'0',
			)}:${String(ss).padStart(2, '0')}`;
		}
	}

	let parsed = dayjs(normalized);
	if (!parsed.isValid()) return null;
	return parsed.format('YYYY-MM-DD HH:mm:ss');
}

export function getJalaliCursorFromGregorian(value) {
	let parts = getJalaliPartsFromGregorian(value || dayjsLocal().format('YYYY-MM-DD'));
	if (!parts) return { year: 1400, month: 1 };
	return {
		year: parts.year,
		month: parts.month,
	};
}

export function previousJalaliMonth(year, month) {
	if (month === 1) {
		return { year: year - 1, month: 12 };
	}
	return { year, month: month - 1 };
}

export function nextJalaliMonth(year, month) {
	if (month === 12) {
		return { year: year + 1, month: 1 };
	}
	return { year, month: month + 1 };
}

export function buildJalaliCalendarWeeks(year, month, selectedGregorian) {
	let monthStartGregorian = jalaliToGregorianDateString(year, month, 1);
	if (!monthStartGregorian) return [];

	let monthStartDate = toUtcDate(monthStartGregorian);
	if (!monthStartDate) return [];

	let selected = normalizeGregorianDateString(selectedGregorian);
	let today = dayjsLocal().format('YYYY-MM-DD');

	// In Persian calendars the week starts on Saturday.
	let offset = (monthStartDate.getUTCDay() + 1) % 7;
	let gridStart = addUtcDays(monthStartDate, -offset);

	let weeks = [];
	for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
		let week = [];
		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			let currentDate = addUtcDays(gridStart, weekIndex * 7 + dayIndex);
			let currentGregorian = formatUtcDate(currentDate);
			let parts = getJalaliPartsFromUtcDate(currentDate);
			if (!parts) continue;

			week.push({
				key: currentGregorian,
				gregorian: currentGregorian,
				jalaliDay: parts.day,
				jalaliMonth: parts.month,
				jalaliYear: parts.year,
				inMonth: parts.year === year && parts.month === month,
				isSelected: selected === currentGregorian,
				isToday: today === currentGregorian,
			});
		}
		weeks.push(week);
	}

	return weeks;
}

function normalizeGregorianDateString(value) {
	if (!value) return '';
	let parsed = dayjs(value);
	if (!parsed.isValid()) return '';
	return parsed.format('YYYY-MM-DD');
}

export function formatJalaliDate(value, format = 'YYYY/MM/DD', options = {}) {
	let { usePersianDigits = true } = options;
	let dateTime = toDateTime(value);
	if (!dateTime || !dateTime.isValid()) return value || '';

	let jalaliParts = getJalaliPartsFromGregorian(dateTime.format('YYYY-MM-DD'));
	if (!jalaliParts) return value || '';

	let hour24 = dateTime.hour();
	let hour12 = hour24 % 12 || 12;
	let minute = dateTime.minute();
	let second = dateTime.second();

	let tokens = {
		YYYY: String(jalaliParts.year),
		YY: String(jalaliParts.year).slice(-2),
		MMMM: jalaliParts.monthName,
		MMM: jalaliParts.monthShortName,
		MM: String(jalaliParts.month).padStart(2, '0'),
		M: String(jalaliParts.month),
		DD: String(jalaliParts.day).padStart(2, '0'),
		D: String(jalaliParts.day),
		dddd: jalaliParts.weekdayName,
		ddd: jalaliParts.weekdayShortName,
		HH: String(hour24).padStart(2, '0'),
		H: String(hour24),
		hh: String(hour12).padStart(2, '0'),
		h: String(hour12),
		mm: String(minute).padStart(2, '0'),
		m: String(minute),
		ss: String(second).padStart(2, '0'),
		s: String(second),
		A: hour24 >= 12 ? 'ب.ظ' : 'ق.ظ',
		a: hour24 >= 12 ? 'ب.ظ' : 'ق.ظ',
	};

	const formatAliases = {
		L: 'YYYY/MM/DD',
		LL: 'D MMMM YYYY',
		LLL: 'D MMMM YYYY HH:mm',
		LLLL: 'dddd D MMMM YYYY HH:mm',
		l: 'YYYY/M/D',
		ll: 'D MMM YYYY',
		lll: 'D MMM YYYY HH:mm',
		llll: 'ddd D MMM YYYY HH:mm',
		LT: 'HH:mm',
		LTS: 'HH:mm:ss',
	};

	let normalizedFormat = formatAliases[format] || format;

	let rendered = normalizedFormat.replace(
		/\[([^\]]+)]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|A|a/g,
		(match, escapedText) => {
			if (escapedText) return escapedText;
			return tokens[match] ?? match;
		},
	);

	return usePersianDigits ? toPersianDigits(rendered) : rendered;
}
