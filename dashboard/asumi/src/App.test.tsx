import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AsumiApp } from './App';

const sceneState = vi.hoisted(() => ({ fail: false }));
vi.mock('./story/scene/OfficeCanvas', () => ({ default: () => {
  if (sceneState.fail) throw new Error('WebGL is unavailable');
  return <div data-testid="office-scene" />;
} }));
afterEach(() => { sceneState.fail = false; vi.restoreAllMocks(); });

test('offers all six semantic Persian chapters without a blocking intro loader', async () => {
  render(<AsumiApp />);
  expect(await screen.findByTestId('office-scene')).toBeInTheDocument();
  expect(screen.getAllByRole('region')).toHaveLength(6);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'آسومی را ببین' })).toHaveAttribute('href', '/hesab');
  expect(screen.getByRole('link', { name: 'رفتن به معرفی آسومی' })).toHaveAttribute('href', '#calm');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '1. آشفتگی' })).toHaveAttribute('aria-current', 'step');
});

test('lets the visitor reduce movement without hiding the narrative or entry link', async () => {
  render(<AsumiApp />);
  await screen.findByTestId('office-scene');
  const control = screen.getByRole('button', { name: 'کاهش حرکت‌های صحنه' });
  fireEvent.click(control);
  expect(control).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('main')).toHaveAttribute('data-reduced-motion', 'true');
  expect(screen.getByRole('link', { name: '6. آرامش' })).toHaveAttribute('href', '#calm');
  fireEvent.click(control);
  expect(screen.getByRole('main')).toHaveAttribute('data-reduced-motion', 'false');
});

test('keeps the story and a real entry route usable when the 3D scene fails', async () => {
  sceneState.fail = true;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<AsumiApp />);
  expect(await screen.findByText('نمای ساده · داستان با اسکرول ادامه دارد')).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('alt', expect.stringContaining('لباس سبز'));
  expect(screen.getByRole('link', { name: 'ورود به آسومی' })).toHaveAttribute('href', '/hesab');
});

test('restores the appropriate stage and updates it on scroll without taking over wheel input', async () => {
  let top = -window.innerHeight * 3;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    top, height: window.innerHeight * 6, bottom: top + window.innerHeight * 6,
    left: 0, right: 1024, width: 1024, x: 0, y: top, toJSON: () => ({}),
  }));
  render(<AsumiApp />);
  await screen.findByTestId('office-scene');
  expect(screen.getByRole('main')).toHaveAttribute('data-chapter', '3');
  expect(screen.getByRole('link', { name: '4. درک' })).toHaveAttribute('aria-current', 'step');
  top = -window.innerHeight * 5;
  fireEvent.scroll(window);
  await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('data-chapter', '5'));
  expect(screen.getByRole('link', { name: '6. آرامش' })).toHaveAttribute('aria-current', 'step');
});
