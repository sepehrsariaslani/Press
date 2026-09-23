import { lerp, transition } from '../chapters';

export const documentCount = 12;
const scattered = [
  [-1.38, 2.35, .0], [.22, 2.50, -.1], [1.35, 1.88, .12],
  [-1.55, 1.06, .65], [.17, .32, 1], [1.40, .44, .7],
  [-1.18, .32, 1], [-.30, 2.7, -.4], [1.17, 2.66, -.35],
  [.60, 1.27, .82], [1.66, 1.01, -.55], [-1.73, 1.79, -.45],
];
export const dashboardPositions = [[.65, 2.28, .0], [1.30, 1.62, .15], [.63, 1.0, .30]];

/** One reversible timeline: no random movement or per-frame accumulated transforms. */
export function documentPose(index: number, progress: number) {
  const order = transition(.025, .20, progress);
  const clarity = transition(.225, .40, progress);
  const calm = transition(.83, 1, progress);
  const from = scattered[index];
  const stack = [.62, .79 + index * .012, -.31];
  const primary = index < 3;
  const target = primary ? dashboardPositions[index] : stack;
  const position = from.map((v, axis) => lerp(lerp(v, stack[axis], order), target[axis], clarity));
  const scatterZ = (index % 2 ? 1 : -1) * (.15 + (index % 4) * .18);
  return {
    position,
    rotation: [lerp(-1.45 * order, 0, primary ? clarity : 0), lerp(.1, .44, clarity), lerp(scatterZ, 0, order)],
    scale: primary ? lerp(.49, .89 - calm * .08, clarity) : .49,
    dashboard: primary ? clarity : 0,
    opacity: primary ? 1 : 1 - .3 * clarity,
  };
}
