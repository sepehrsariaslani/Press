import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AsumiApp } from './App';

afterEach(() => vi.restoreAllMocks());

test('renders a real SVG evidence board, six Persian chapters and the existing entry route without 3D media', () => {
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('img', { name: /پرونده‌ی کسب‌وکار/ })).toBeInTheDocument();
  expect(container.querySelectorAll('.evidence-card')).toHaveLength(8);
  expect(container.querySelector('canvas, img, video')).not.toBeInTheDocument();
  expect(screen.getAllByRole('region')).toHaveLength(6);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'آسومی را ببین' })).toHaveAttribute('href', '/hesab');
  expect(screen.getByRole('link', { name: '1. کشف' })).toHaveAttribute('aria-current', 'step');
});

test('moves the flashlight with the pointer while keeping scroll and links available', async () => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 0, left: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON: () => ({}),
  });
  const { container } = render(<AsumiApp />);
  fireEvent(window, new MouseEvent('pointermove', { clientX: 630, clientY: 350 }));
  await waitFor(() => expect(Number(container.querySelector('circle[data-flashlight]')?.getAttribute('cx'))).toBeGreaterThan(600));
  const touch = new MouseEvent('pointermove', { clientX: 950, clientY: 700 });
  Object.defineProperty(touch, 'pointerType', { value: 'touch' });
  fireEvent(window, touch);
  await waitFor(() => expect(Number(container.querySelector('circle[data-flashlight]')?.getAttribute('cx'))).toBeLessThan(240));
  expect(screen.getByRole('link', { name: '2. نظم' })).toHaveAttribute('href', '#order');
  expect(screen.getByRole('link', { name: 'ورود به آسومی' })).toHaveAttribute('href', '/hesab');
});

test('reduced motion reveals all documents without requiring the visitor to aim a flashlight', async () => {
  const { container } = render(<AsumiApp />);
  const control = screen.getByRole('button', { name: 'کاهش حرکت‌های صحنه' });
  fireEvent.click(control);
  expect(control).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(container.querySelector('[data-mask-ambient]')).toHaveAttribute('opacity', '1.000'));
  expect(screen.getByTestId('case-board')).toHaveAttribute('data-flashlight', 'false');
  fireEvent.click(control);
  expect(screen.getByRole('main')).toHaveAttribute('data-reduced-motion', 'false');
});

test('restores deep scroll and completes the visible decision route at the destination', async () => {
  let top = -window.innerHeight * 3;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    top, height: window.innerHeight * 6, bottom: top + window.innerHeight * 6,
    left: 0, right: 1024, width: 1024, x: 0, y: top, toJSON: () => ({}),
  }));
  const { container } = render(<AsumiApp />);
  expect(screen.getByRole('main')).toHaveAttribute('data-chapter', '3');
  expect(screen.getByRole('link', { name: '4. وضوح' })).toHaveAttribute('aria-current', 'step');
  top = -window.innerHeight * 5;
  fireEvent.click(screen.getByRole('button', { name: 'کاهش حرکت‌های صحنه' }));
  fireEvent.scroll(window);
  await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('data-chapter', '5'));
  await waitFor(() => expect(container.querySelector('.route-line')).toHaveAttribute('stroke-dashoffset', '0'));
  expect(container.querySelector('.route-destination')).toHaveAttribute('opacity', '1.000');
  expect(screen.getByRole('link', { name: '6. مقصد' })).toHaveAttribute('aria-current', 'step');
});

test('removes its pointer listeners on unmount', () => {
  const remove = vi.spyOn(window, 'removeEventListener');
  const { unmount } = render(<AsumiApp />);
  unmount();
  expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));
  expect(remove).toHaveBeenCalledWith('pointerout', expect.any(Function));
});
