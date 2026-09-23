import { describe, expect, test } from 'vitest';
import { chapterAt } from '../chapters';
import { documentCount, documentPose, dashboardPositions } from './documentMotion';

describe('reversible paper-to-dashboard choreography', () => {
  test('gathers all papers into one aligned stack before revealing three dashboards', () => {
    for (let i = 0; i < documentCount; i++) {
      const ordered = documentPose(i, .2);
      expect(ordered.position[0]).toBeCloseTo(.62);
      expect(ordered.position[2]).toBeCloseTo(-.31);
      expect(ordered.rotation[2]).toBeCloseTo(0);
      expect(ordered.dashboard).toBe(0);
      const clear = documentPose(i, .4);
      expect(clear.dashboard).toBe(i < 3 ? 1 : 0);
      if (i < 3) clear.position.forEach((value, axis) => expect(value).toBeCloseTo(dashboardPositions[i][axis]));
    }
  });
  test('is continuous, finite and deterministic when scrolling forward or backward', () => {
    for (let i = 0; i < documentCount; i++) {
      for (let step = 0; step <= 100; step++) {
        const p = step / 100, pose = documentPose(i, p);
        expect([...pose.position, ...pose.rotation, pose.scale].every(Number.isFinite)).toBe(true);
        expect(pose.dashboard).toBeGreaterThanOrEqual(0);
        expect(pose.dashboard).toBeLessThanOrEqual(1);
        documentPose(i, 1 - p);
        expect(documentPose(i, p)).toEqual(pose);
        if (p < 1) {
          const next = documentPose(i, p + .0001);
          expect(Math.max(...next.position.map((v, axis) => Math.abs(v - pose.position[axis])))).toBeLessThan(.01);
        }
      }
    }
  });
  test('clamps chapter selection, including anchor landing and restored scroll', () => {
    expect(chapterAt(-1)).toBe(0);
    expect(chapterAt(.6)).toBe(3);
    expect(chapterAt(1)).toBe(5);
    expect(chapterAt(2)).toBe(5);
  });
});
