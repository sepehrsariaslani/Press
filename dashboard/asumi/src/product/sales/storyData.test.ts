import { expect, test } from 'vitest';
import { salesChapters, salesFlow, salesQuote, salesSample, salesSignals } from './storyData';

test('keeps the sample quotation and advance payment arithmetically consistent', () => {
	expect(salesQuote.grossTotal).toBe(288_000_000);
	expect(salesQuote.discountAmount).toBe(14_400_000);
	expect(salesQuote.total).toBe(273_600_000);
	expect(salesSample.advancePercent).toBe(40);
});

test('provides six distinct scroll chapters and the connected order signals', () => {
	expect(salesChapters).toHaveLength(6);
	expect(new Set(salesChapters.map(chapter => chapter.id)).size).toBe(6);
	expect(salesFlow.map(item => item.id)).toEqual(['inventory', 'delivery', 'shipment', 'finance']);
	expect(salesSignals.map(item => item.id)).toEqual(['follow-up', 'repeat-sales', 'late-orders']);
});
