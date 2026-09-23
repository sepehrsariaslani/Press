import { expect, test } from 'vitest';
import { calculateOperatingProfit, financeProfit, financeSample } from './storyData';

test('keeps the illustrative current and previous period profit math consistent', () => {
	expect(calculateOperatingProfit(financeSample.current)).toBe(200);
	expect(calculateOperatingProfit(financeSample.previous)).toBe(268);
	expect(financeProfit.previous - financeProfit.current).toBe(68);
});
