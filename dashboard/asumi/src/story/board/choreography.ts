import { clamp, lerp, transition } from '../chapters';
import { evidence } from './evidence';

export function evidencePose(index: number, progress: number) {
  const item = evidence[index];
  const gather = transition(.025 + index * .004, .19 + index * .004, progress);
  const charts = transition(.455 + index * .006, .595 + index * .006, progress);
  const route = transition(.62, .80, progress);
  const primary = index < 3;
  const chartPlaces = [[227, 289], [511, 264], [790, 300]];
  const pinned = item.scattered.map((value, axis) => lerp(value, item.pinned[axis], gather));
  const x = primary ? lerp(pinned[0], chartPlaces[index][0], charts) : pinned[0];
  const y = primary ? lerp(pinned[1], chartPlaces[index][1] - route * 22, charts) : pinned[1];
  return {
    x, y, angle: lerp(pinned[2], 0, primary ? charts : route * .7),
    width: lerp(item.width, primary ? 225 : item.width * .78, charts),
    height: lerp(item.height, primary ? 178 : item.height * .78, charts),
    opacity: primary ? 1 : lerp(1, .09, charts),
    documentOpacity: 1 - (primary ? charts : 0),
    chartOpacity: primary ? charts : 0,
    pinned: gather,
  };
}

export function pinPosition(pose: ReturnType<typeof evidencePose>) {
  const angle = pose.angle * Math.PI / 180;
  const offset = -pose.height / 2 + 7;
  return { x: pose.x - Math.sin(angle) * offset, y: pose.y + Math.cos(angle) * offset };
}

export function threadPath(start: ReturnType<typeof pinPosition>, end: ReturnType<typeof pinPosition>, index: number) {
  const slack = index % 2 ? 29 : 13;
  return `M${start.x} ${start.y} Q${(start.x + end.x) / 2} ${(start.y + end.y) / 2 + slack} ${end.x} ${end.y}`;
}

export function threadProgress(index: number, progress: number) {
  return transition(.245 + index * .009, .32 + index * .01, progress);
}

export function flashlightPosition(progress: number) {
  const step = clamp(progress / .19) * (evidence.length - 1);
  const start = evidence[Math.floor(step)].scattered;
  const end = evidence[Math.min(evidence.length - 1, Math.ceil(step))].scattered;
  return { x: lerp(start[0], end[0], step % 1), y: lerp(start[1], end[1], step % 1) };
}

export function pointerToScene(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  const scale = Math.max(.001, Math.min(rect.width / 1000, rect.height / 800));
  return {
    x: (clientX - rect.left - (rect.width - 1000 * scale) / 2) / scale,
    y: (clientY - rect.top - (rect.height - 800 * scale) / 2) / scale,
  };
}
