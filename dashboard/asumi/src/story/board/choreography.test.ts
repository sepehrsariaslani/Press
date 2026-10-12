import { expect, test } from 'vitest';
import { evidence } from './evidence';
import { evidencePose, flashlightPosition, pinPosition, pointerToScene, threadPath, threadProgress } from './choreography';

test('pins every scattered paper to its board location before threads appear', () => {
  evidence.forEach((item, index) => {
    const pose = evidencePose(index, .23);
    expect(pose.x).toBeCloseTo(item.pinned[0]);
    expect(pose.y).toBeCloseTo(item.pinned[1]);
    expect(pose.angle).toBeCloseTo(item.pinned[2]);
    expect(threadProgress(index, .23)).toBe(0);
    expect(threadProgress(index, .45)).toBe(1);
  });
});

test('transforms three original documents into charts instead of adding an unrelated dashboard', () => {
  evidence.forEach((_, index) => {
    const pose = evidencePose(index, .65);
    if (index < 3) {
      expect(pose.chartOpacity).toBe(1);
      expect(pose.documentOpacity).toBe(0);
      expect(pose.width).toBe(225);
    } else expect(pose.chartOpacity).toBe(0);
  });
});

test('paper and thread geometry is reversible and continuous across the whole scroll range', () => {
  for (let index = 0; index < evidence.length; index++) {
    for (let step = 0; step <= 100; step++) {
      const progress = step / 100, pose = evidencePose(index, progress);
      expect(Object.values(pose).every(Number.isFinite)).toBe(true);
      const pin = pinPosition(pose);
      expect(threadPath(pin, pinPosition(evidencePose((index + 1) % evidence.length, progress)), index)).not.toMatch(/NaN|Infinity/);
      evidencePose(index, 1 - progress);
      expect(evidencePose(index, progress)).toEqual(pose);
      const next = evidencePose(index, progress + .0001);
      expect(Math.abs(next.x - pose.x) + Math.abs(next.y - pose.y)).toBeLessThan(1);
    }
  }
});

test('maps pointer coordinates through centered SVG letterboxing correctly', () => {
  expect(pointerToScene(260, 420, { left: 10, top: 20, width: 500, height: 800 })).toEqual({ x: 500, y: 400 });
  expect(pointerToScene(500, 400, { left: 0, top: 0, width: 1000, height: 800 })).toEqual({ x: 500, y: 400 });
});

test('touch and keyboard scrolling automatically scan all papers without mouse movement', () => {
  evidence.forEach((item, index) => {
    const position = flashlightPosition(.19 * index / (evidence.length - 1));
    expect(position.x).toBeCloseTo(item.scattered[0]);
    expect(position.y).toBeCloseTo(item.scattered[1]);
  });
});
