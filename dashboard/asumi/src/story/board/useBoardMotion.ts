import { useEffect } from 'react';
import type { RefObject } from 'react';
import type { MotionRef } from '../useStoryProgress';
import { chapterAt, lerp, transition } from '../chapters';
import { connections, evidence } from './evidence';
import { evidencePose, flashlightPosition, pinPosition, pointerToScene, threadPath, threadProgress } from './choreography';

const opacity = (element: SVGElement | null, value: number) => element?.setAttribute('opacity', value.toFixed(3));

function collectElements(svg: SVGSVGElement) {
  return {
    cards: Array.from(svg.querySelectorAll<SVGGElement>('.evidence-card')).map(group => ({
      group, paper: group.querySelector<SVGRectElement>('.paper-body')!,
      face: group.querySelector<SVGGElement>('.evidence-document')!, chart: group.querySelector<SVGGElement>('.evidence-chart')!,
      pin: group.querySelector<SVGGElement>('.evidence-pin')!, fold: group.querySelector<SVGPathElement>('.paper-fold')!,
    })),
    threads: Array.from(svg.querySelectorAll<SVGPathElement>('.evidence-thread')),
    nodes: Array.from(svg.querySelectorAll<SVGGElement>('.route-node')),
    mask: svg.querySelector<SVGRectElement>('[data-mask-ambient]')!,
    beam: svg.querySelector<SVGCircleElement>('[data-flashlight]')!,
    glow: svg.querySelector<SVGCircleElement>('[data-beam-glow]')!,
    board: svg.querySelector<SVGGElement>('.pin-board')!,
    route: svg.querySelector<SVGGElement>('.route-map')!,
    routeLine: svg.querySelector<SVGPathElement>('.route-line')!,
    routeFinish: svg.querySelector<SVGGElement>('.route-destination')!,
  };
}

function updatePapers(elements: ReturnType<typeof collectElements>, progress: number) {
  return evidence.map((_, index) => {
    const pose = evidencePose(index, progress);
    const { group, paper, face, chart, pin, fold } = elements.cards[index];
    group.setAttribute('transform', `translate(${pose.x} ${pose.y}) rotate(${pose.angle})`);
    opacity(group, pose.opacity);
    paper.setAttribute('x', String(-pose.width / 2)); paper.setAttribute('y', String(-pose.height / 2));
    paper.setAttribute('width', String(pose.width)); paper.setAttribute('height', String(pose.height));
    opacity(face, pose.documentOpacity); opacity(chart, pose.chartOpacity);
    pin.setAttribute('transform', `translate(0 ${-pose.height / 2 + 7})`);
    opacity(pin, pose.pinned);
    fold.setAttribute('d', `M${pose.width / 2 - 15} ${pose.height / 2} l15 -15 v15Z`);
    return pinPosition(pose);
  });
}

function updateConnections(elements: ReturnType<typeof collectElements>, progress: number, pins: ReturnType<typeof pinPosition>[]) {
  elements.threads.forEach((path, index) => {
    const [start, end] = connections[index];
    path.setAttribute('d', threadPath(pins[start], pins[end], index));
    path.setAttribute('stroke-dashoffset', String(1 - threadProgress(index, progress)));
    opacity(path, (1 - transition(.48, .61, progress) * .83));
  });
  opacity(elements.route, transition(.57, .63, progress));
  elements.routeLine.setAttribute('stroke-dashoffset', String(1 - transition(.585, .81, progress)));
  elements.nodes.forEach((node, index) => opacity(node, transition(.59 + index * .055, .63 + index * .055, progress)));
  opacity(elements.routeFinish, transition(.79, .92, progress));
}

export function useBoardMotion(root: RefObject<SVGSVGElement | null>, motion: MotionRef) {
  useEffect(() => {
    const svg = root.current;
    if (!svg) return;
    const elements = collectElements(svg);
    let bounds = svg.getBoundingClientRect();
    let frame = 0, previousTime = 0, progress = motion.current.progress;
    let pointer = flashlightPosition(progress), beam = { ...pointer }, pointerActive = false;
    const draw = (time: number) => {
      frame = 0;
      const reduced = motion.current.reducedMotion;
      const target = reduced ? chapterAt(motion.current.progress) / 5 : motion.current.progress;
      const factor = reduced ? 1 : 1 - Math.exp(-Math.min(time - previousTime || 16, 64) / 70);
      previousTime = time;
      progress = Math.abs(target - progress) < .0001 ? target : lerp(progress, target, factor);
      const targetBeam = pointerActive && !reduced ? pointer : flashlightPosition(progress);
      beam = { x: lerp(beam.x, targetBeam.x, factor), y: lerp(beam.y, targetBeam.y, factor) };
      const pins = updatePapers(elements, progress);
      updateConnections(elements, progress, pins);
      opacity(elements.board, transition(.07, .21, progress));
      opacity(elements.mask, reduced ? 1 : lerp(.10, 1, transition(.10, .245, progress)));
      for (const circle of [elements.beam, elements.glow]) {
        circle.setAttribute('cx', String(beam.x)); circle.setAttribute('cy', String(beam.y));
      }
      opacity(elements.glow, reduced ? 0 : .6 * (1 - transition(.07, .22, progress)));
      svg.dataset.progress = progress.toFixed(3);
      svg.dataset.flashlight = String(!reduced && progress < .245);
      if (Math.abs(target - progress) > .0001 || Math.abs(targetBeam.x - beam.x) + Math.abs(targetBeam.y - beam.y) > .25) schedule();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') { pointerActive = false; schedule(); return; }
      if (motion.current.reducedMotion || motion.current.progress > .245) return;
      pointerActive = true; pointer = pointerToScene(event.clientX, event.clientY, bounds); schedule();
    };
    const onLeave = (event: Event) => {
      if ('relatedTarget' in event && event.relatedTarget) return;
      pointerActive = false; schedule();
    };
    const measure = () => { bounds = svg.getBoundingClientRect(); schedule(); };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined;
    observer?.observe(svg);
    motion.current.invalidate = schedule;
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerout', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('resize', measure);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect(); motion.current.invalidate = undefined;
      window.removeEventListener('pointermove', onPointer); window.removeEventListener('pointerout', onLeave);
      window.removeEventListener('blur', onLeave); window.removeEventListener('resize', measure);
    };
  }, [root, motion]);
}
