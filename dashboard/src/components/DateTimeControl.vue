<template>
	<div class="flex items-center space-x-1">
		<FormControl
			class="flex-[4]"
			:class="label ? 'mt-5' : ''"
			:label="hideLabel ? '' : label ? label : 'تاریخ'"
			type="select"
			variant="outline"
			:options="dayOptions"
			v-model="scheduledDate"
			placeholder="انتخاب تاریخ"
		/>
		<FormControl
			class="flex-[3]"
			:class="label ? 'mt-5' : ''"
			:label="hideLabel ? '' : label ? label : 'ساعت'"
			type="select"
			variant="outline"
			:options="hourOptions"
			v-model="scheduledHour"
			placeholder="انتخاب ساعت"
		/>
		<FormControl
			class="flex-[3]"
			:class="label ? 'mt-5' : ''"
			:label="hideLabel ? '' : label ? label : 'دقیقه'"
			type="select"
			variant="outline"
			:options="minuteOptions"
			v-model="scheduledMinute"
			placeholder="انتخاب دقیقه"
		/>
	</div>
</template>

<script>
import dayjs from '../utils/dayjs';
import { formatJalaliDate, toPersianDigits } from '@/utils/jalali';

export default {
	props: ['modelValue', 'label', 'hideLabel'],
	emits: ['update:modelValue'],
	computed: {
		scheduledDate: {
			get() {
				return this.modelValue ? this.modelValue.split('T')[0] : '';
			},
			set(value) {
				this.$emit(
					'update:modelValue',
					`${value}T${this.scheduledHour}:${this.scheduledMinute}`,
				);
			},
		},
		scheduledHour: {
			get() {
				return this.modelValue
					? Number(this.modelValue.split('T')[1].split(':')[0])
					: '';
			},
			set(value) {
				this.$emit(
					'update:modelValue',
					`${this.scheduledDate}T${value.toString().padStart(2, '0')}:${
						this.scheduledMinute
					}`,
				);
			},
		},
		scheduledMinute: {
			get() {
				return this.modelValue
					? Number(this.modelValue.split('T')[1].split(':')[1])
					: '';
			},
			set(value) {
				this.$emit(
					'update:modelValue',
					`${this.scheduledDate}T${this.scheduledHour}:${value
						.toString()
						.padStart(2, '0')}`,
				);
			},
		},
		dayOptions() {
			let days = [];
			for (let i = 0; i < 7; i++) {
				let currentDate = dayjs().add(i, 'day').format('YYYY-MM-DD');
				days.push({
					label: formatJalaliDate(currentDate, 'dddd، D MMMM'),
					value: currentDate,
				});
			}
			return days;
		},
		hourOptions() {
			let options = [...Array(24).keys()].map((n) => ({
				label:
					n < 12
						? `${toPersianDigits((n == 0 ? 12 : n).toString().padStart(2, '0'))} ق.ظ`
						: `${toPersianDigits((n != 12 ? n - 12 : n).toString().padStart(2, '0'))} ب.ظ`,
				value: n,
			}));

			if (this.scheduledDate === dayjs().format('YYYY-MM-DD')) {
				options = options.filter(
					(option) =>
						option.value >=
						(dayjs().minute() < 45 ? dayjs().hour() : dayjs().hour() + 1),
				);
			}

			return options;
		},
		minuteOptions() {
			let options = [0, 15, 30, 45].map((i) => ({
				label: toPersianDigits(i.toString().padStart(2, '0')),
				value: i,
			}));

			if (
				this.scheduledDate === dayjs().format('YYYY-MM-DD') &&
				this.scheduledHour === String(dayjs().hour())
			) {
				options = options.filter((option) => option.value >= dayjs().minute());
			}

			return options;
		},
	},
};
</script>
