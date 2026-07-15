<script setup>
import { computed, ref, watch } from 'vue';
import { currentJalaliYear, enDigitsToFa } from '@/utils/jalali';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'تاریخ',
  },
});

const emit = defineEmits(['update:modelValue']);

const monthOptions = [
  { value: 1, label: 'فروردین' },
  { value: 2, label: 'اردیبهشت' },
  { value: 3, label: 'خرداد' },
  { value: 4, label: 'تیر' },
  { value: 5, label: 'مرداد' },
  { value: 6, label: 'شهریور' },
  { value: 7, label: 'مهر' },
  { value: 8, label: 'آبان' },
  { value: 9, label: 'آذر' },
  { value: 10, label: 'دی' },
  { value: 11, label: 'بهمن' },
  { value: 12, label: 'اسفند' },
];

function parseInitialDate(value) {
  if (!value) {
    const year = currentJalaliYear();
    return { year, month: 1, day: 1 };
  }

  const [year, month, day] = value.split('-').map(Number);
  if ([year, month, day].some(Number.isNaN)) {
    const fallbackYear = currentJalaliYear();
    return { year: fallbackYear, month: 1, day: 1 };
  }

  return { year, month, day };
}

const initial = parseInitialDate(props.modelValue);
const selectedYear = ref(initial.year);
const selectedMonth = ref(initial.month);
const selectedDay = ref(initial.day);

const years = computed(() => {
  const base = currentJalaliYear();
  return Array.from({ length: 8 }).map((_, i) => base - 1 + i);
});

const dayCount = computed(() => {
  if (selectedMonth.value <= 6) return 31;
  if (selectedMonth.value <= 11) return 30;
  return 29;
});

const days = computed(() =>
  Array.from({ length: dayCount.value }).map((_, i) => i + 1)
);

watch(dayCount, (count) => {
  if (selectedDay.value > count) {
    selectedDay.value = count;
  }
});

watch(
  () => props.modelValue,
  (value) => {
    if (!value) return;
    const next = parseInitialDate(value);
    selectedYear.value = next.year;
    selectedMonth.value = next.month;
    selectedDay.value = next.day;
  }
);

watch([selectedYear, selectedMonth, selectedDay], () => {
  const y = selectedYear.value;
  const m = String(selectedMonth.value).padStart(2, '0');
  const d = String(selectedDay.value).padStart(2, '0');
  emit('update:modelValue', `${y}-${m}-${d}`);
});
</script>

<template>
  <div class="jalali-picker">
    <label>{{ label }}</label>
    <div class="jalali-picker__fields">
      <select v-model.number="selectedYear">
        <option v-for="year in years" :key="year" :value="year">{{ enDigitsToFa(year) }}</option>
      </select>
      <select v-model.number="selectedMonth">
        <option v-for="month in monthOptions" :key="month.value" :value="month.value">{{ month.label }}</option>
      </select>
      <select v-model.number="selectedDay">
        <option v-for="day in days" :key="day" :value="day">{{ enDigitsToFa(day) }}</option>
      </select>
    </div>
  </div>
</template>
