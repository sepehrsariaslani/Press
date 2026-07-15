<template>
	<Popover
		class="inline-block"
		:placement="placement"
		@open="initFromValue"
		@close="handleClose"
	>
		<template #target="{ togglePopover, isOpen }">
			<slot
				name="target"
				v-bind="{ togglePopover, isOpen, displayLabel, inputValue }"
			>
				<TextInput
					v-model="inputValue"
					type="text"
					class="cursor-text w-full"
					:class="props.inputClass"
					:label="props.label"
					:variant="props.variant"
					:placeholder="props.placeholder"
					:disabled="props.disabled"
					:readonly="props.readonly || !props.allowCustom"
					@focus="activateInput(isOpen, togglePopover)"
					@click="activateInput(isOpen, togglePopover)"
					@blur="onBlur"
					@keydown.enter.prevent="onEnter(togglePopover)"
				>
					<template v-if="$slots.prefix" #prefix>
						<slot
							name="prefix"
							v-bind="{ togglePopover, isOpen, displayLabel, inputValue }"
						/>
					</template>
					<template #suffix>
						<slot
							name="suffix"
							v-bind="{ togglePopover, isOpen, displayLabel, inputValue }"
						>
							<FeatherIcon
								name="chevron-down"
								class="h-4 w-4 cursor-pointer"
								@mousedown.prevent="togglePopover"
							/>
						</slot>
					</template>
				</TextInput>
			</slot>
		</template>

		<template #body="{ togglePopover }">
			<div
				ref="popoverContentRef"
				class="w-fit min-w-60 select-none text-base text-ink-gray-9 rounded-lg bg-surface-modal shadow-2xl ring-1 ring-black ring-opacity-5 mt-2"
			>
				<div class="flex items-center justify-between p-2 pb-0 gap-1">
					<Button
						variant="ghost"
						size="sm"
						class="text-sm font-medium text-ink-gray-7"
						@click="cycleView"
					>
						<span v-if="view === 'date'">
							{{ currentMonthName }} {{ toPersianDigits(currentYear) }}
						</span>
						<span v-else-if="view === 'month'">
							{{ toPersianDigits(currentYear) }}
						</span>
						<span v-else>
							{{ toPersianDigits(yearRangeStart) }} -
							{{ toPersianDigits(yearRangeStart + 11) }}
						</span>
					</Button>
					<div class="flex items-center">
						<Button
							variant="ghost"
							icon="chevron-right"
							class="size-7"
							@click="prev"
						/>
						<Button
							v-if="!props.clearable"
							variant="ghost"
							class="text-xs"
							:label="'امروز'"
							@click="() => handleTodayClick(togglePopover)"
						/>
						<Button
							variant="ghost"
							icon="chevron-left"
							class="size-7"
							@click="next"
						/>
					</div>
				</div>
				<div class="p-2">
					<div v-if="view === 'date'" role="grid" aria-label="تقویم جلالی">
						<div
							class="flex items-center text-xs font-medium text-ink-gray-4 mb-1"
						>
							<div
								v-for="d in weekHeader"
								:key="d"
								class="flex h-6 w-8 items-center justify-center"
							>
								{{ d }}
							</div>
						</div>
						<div v-for="(week, wi) in weeks" :key="wi" class="flex" role="row">
							<button
								v-for="dateObj in week"
								type="button"
								:key="dateObj.key"
								class="flex h-8 w-8 items-center justify-center rounded cursor-pointer text-sm focus:outline-none focus:ring-2 focus:ring-outline-gray-2"
								:class="[
									dateObj.inMonth ? 'text-ink-gray-8' : 'text-ink-gray-3',
									dateObj.isToday ? 'font-extrabold text-ink-gray-9' : '',
									dateObj.isSelected
										? 'bg-surface-gray-6 text-ink-white hover:bg-surface-gray-6'
										: 'hover:bg-surface-gray-2',
								]"
								role="gridcell"
								:aria-selected="dateObj.isSelected ? 'true' : 'false'"
								@click="handleDateCellClick(dateObj.gregorian, togglePopover)"
							>
								{{ toPersianDigits(dateObj.jalaliDay) }}
							</button>
						</div>
					</div>
					<div
						v-else-if="view === 'month'"
						class="grid grid-cols-3 gap-1"
						role="grid"
						aria-label="انتخاب ماه"
					>
						<button
							v-for="(m, i) in months"
							type="button"
							:key="m"
							class="py-2 text-sm rounded cursor-pointer text-center hover:bg-surface-gray-2 focus:outline-none focus:ring-2 focus:ring-brand-6"
							:class="{
								'bg-surface-gray-6 text-ink-white hover:bg-surface-gray-6':
									i + 1 === currentMonth,
							}"
							@click="selectMonth(i + 1)"
						>
							{{ m }}
						</button>
					</div>
					<div
						v-else
						class="grid grid-cols-3 gap-1"
						role="grid"
						aria-label="انتخاب سال"
					>
						<button
							v-for="y in yearRange"
							type="button"
							:key="y"
							class="py-2 text-sm rounded cursor-pointer text-center hover:bg-surface-gray-2 focus:outline-none focus:ring-2 focus:ring-brand-6"
							:class="{
								'bg-surface-gray-6 text-ink-white hover:bg-surface-gray-6':
									y === currentYear,
							}"
							@click="selectYear(y)"
						>
							{{ toPersianDigits(y) }}
						</button>
					</div>
				</div>
				<div
					v-if="props.clearable"
					class="flex items-center justify-between gap-1 p-2 border-t"
				>
					<div class="flex gap-1">
						<Button
							variant="outline"
							:label="'امروز'"
							@click="() => handleTodayClick(togglePopover)"
						/>
						<Button
							variant="outline"
							:label="'فردا'"
							@click="() => handleTomorrowClick(togglePopover)"
						/>
					</div>
					<Button
						v-if="selected"
						size="sm"
						variant="outline"
						:label="'پاک کردن'"
						@click="() => handleClearClick(togglePopover)"
					/>
				</div>
			</div>
		</template>
	</Popover>
</template>

<script setup>
import { computed, ref, toRefs, watch } from 'vue';
import { Button, FeatherIcon, Popover, TextInput } from 'frappe-ui';
import dayjs, { dayjsLocal } from '@/utils/dayjs';
import {
	buildJalaliCalendarWeeks,
	formatJalaliDate,
	getJalaliCursorFromGregorian,
	getJalaliMonthNames,
	getJalaliWeekHeader,
	nextJalaliMonth,
	parseJalaliDateInput,
	previousJalaliMonth,
	toPersianDigits,
} from '@/utils/jalali';

const props = defineProps({
	value: {
		type: [String, Date],
		default: '',
	},
	modelValue: {
		type: [String, Date],
		default: '',
	},
	placement: {
		type: String,
		default: 'bottom-start',
	},
	variant: {
		type: String,
		default: 'subtle',
	},
	placeholder: {
		type: String,
		default: 'انتخاب تاریخ',
	},
	readonly: {
		type: Boolean,
		default: false,
	},
	allowCustom: {
		type: Boolean,
		default: true,
	},
	autoClose: {
		type: Boolean,
		default: true,
	},
	disabled: {
		type: Boolean,
		default: false,
	},
	clearable: {
		type: Boolean,
		default: true,
	},
	format: {
		type: String,
		default: '',
	},
	label: {
		type: String,
		default: '',
	},
	inputClass: {
		type: String,
		default: '',
	},
});

const emit = defineEmits(['update:modelValue', 'change']);

const { autoClose } = toRefs(props);

const months = getJalaliMonthNames();
const weekHeader = getJalaliWeekHeader();

const view = ref('date');
const selected = ref('');
const inputValue = ref('');
const isTyping = ref(false);

const initialValue = ref(props.modelValue || props.value || '');

const nowCursor = getJalaliCursorFromGregorian(dayjsLocal().format('YYYY-MM-DD'));
const currentYear = ref(nowCursor.year);
const currentMonth = ref(nowCursor.month);

function coerceToGregorianDate(value) {
	if (!value) return null;
	if (value instanceof Date) {
		let parsedDate = dayjs(value);
		return parsedDate.isValid() ? parsedDate.format('YYYY-MM-DD') : null;
	}

	let raw = String(value).trim();
	if (!raw) return null;

	return parseJalaliDateInput(raw);
}

function syncFromValue(value) {
	if (!value) {
		if (!props.clearable) {
			let today = dayjsLocal().format('YYYY-MM-DD');
			selected.value = today;
			let cursor = getJalaliCursorFromGregorian(today);
			currentYear.value = cursor.year;
			currentMonth.value = cursor.month;
		} else {
			selected.value = '';
		}
		return;
	}

	let normalized = coerceToGregorianDate(value);
	if (!normalized) {
		selected.value = '';
		return;
	}

	selected.value = normalized;
	let cursor = getJalaliCursorFromGregorian(normalized);
	currentYear.value = cursor.year;
	currentMonth.value = cursor.month;
}

syncFromValue(initialValue.value);

function initFromValue() {
	syncFromValue(props.modelValue || props.value);
}

watch(
	() => [props.modelValue, props.value],
	([modelValue, value]) => {
		syncFromValue(modelValue || value);
	},
);

const currentMonthName = computed(() => months[currentMonth.value - 1]);

const displayLabel = computed(() => {
	if (!selected.value) return '';
	let format = props.format || 'YYYY/MM/DD';
	return formatJalaliDate(selected.value, format);
});

watch(displayLabel, (value) => {
	if (!isTyping.value) {
		inputValue.value = value;
	}
});

inputValue.value = displayLabel.value;

function maybeClose(togglePopover, condition = true) {
	if (condition && autoClose.value && togglePopover) togglePopover();
}

function clearSelection() {
	if (!selected.value) return;
	selected.value = '';
	emit('update:modelValue', '');
	emit('change', '');
	initialValue.value = '';
	inputValue.value = '';
}

function commitInput(close = false, togglePopover) {
	let raw = inputValue.value.trim();
	if (!raw) {
		if (!props.clearable) {
			selectDate(dayjsLocal().format('YYYY-MM-DD'));
			maybeClose(togglePopover, close);
		} else {
			clearSelection();
			maybeClose(togglePopover, close);
		}
		return;
	}

	let parsed = coerceToGregorianDate(raw);
	if (parsed) {
		selectDate(parsed);
		maybeClose(togglePopover, close);
	}
}

const popoverContentRef = ref(null);

function onBlur(event) {
	let next = event.relatedTarget;
	if (next && popoverContentRef.value?.contains(next)) return;
	commitInput();
	isTyping.value = false;
}

function onEnter(togglePopover) {
	commitInput(true, togglePopover);
	isTyping.value = false;
}

function activateInput(isOpen, togglePopover) {
	isTyping.value = true;
	if (!isOpen) togglePopover();
}

const weeks = computed(() =>
	buildJalaliCalendarWeeks(currentYear.value, currentMonth.value, selected.value),
);

function selectDate(value) {
	let normalized = coerceToGregorianDate(value);
	if (!normalized) return;

	let previousValue = selected.value;
	selected.value = normalized;
	let cursor = getJalaliCursorFromGregorian(normalized);
	currentYear.value = cursor.year;
	currentMonth.value = cursor.month;

	if (selected.value !== initialValue.value) {
		emit('update:modelValue', selected.value);
		if (selected.value !== previousValue) {
			emit('change', selected.value);
		}
		initialValue.value = selected.value;
	}

	if (!isTyping.value) {
		inputValue.value = displayLabel.value;
	}

	view.value = 'date';
}

function selectMonth(month) {
	currentMonth.value = month;
	view.value = 'date';
}

function selectYear(year) {
	currentYear.value = year;
	view.value = 'month';
}

function prev() {
	if (view.value === 'date') {
		let cursor = previousJalaliMonth(currentYear.value, currentMonth.value);
		currentYear.value = cursor.year;
		currentMonth.value = cursor.month;
	} else if (view.value === 'month') {
		currentYear.value -= 1;
	} else {
		currentYear.value -= 12;
	}
}

function next() {
	if (view.value === 'date') {
		let cursor = nextJalaliMonth(currentYear.value, currentMonth.value);
		currentYear.value = cursor.year;
		currentMonth.value = cursor.month;
	} else if (view.value === 'month') {
		currentYear.value += 1;
	} else {
		currentYear.value += 12;
	}
}

function handleDateCellClick(date, togglePopover) {
	selectDate(date);
	if (autoClose.value) togglePopover();
	isTyping.value = false;
}

function handleTodayClick(togglePopover) {
	handleDateCellClick(dayjsLocal().format('YYYY-MM-DD'), togglePopover);
}

function handleTomorrowClick(togglePopover) {
	handleDateCellClick(dayjsLocal().add(1, 'day').format('YYYY-MM-DD'), togglePopover);
}

function handleClearClick(togglePopover) {
	clearSelection();
	maybeClose(togglePopover);
	isTyping.value = false;
	view.value = 'date';
}

function cycleView() {
	if (view.value === 'date') view.value = 'month';
	else if (view.value === 'month') view.value = 'year';
	else view.value = 'date';
}

function handleClose() {
	view.value = 'date';
	if (isTyping.value) {
		commitInput();
		isTyping.value = false;
	}
}

const yearRangeStart = computed(() => currentYear.value - (currentYear.value % 12));
const yearRange = computed(() =>
	Array.from({ length: 12 }, (_, index) => yearRangeStart.value + index),
);
</script>
