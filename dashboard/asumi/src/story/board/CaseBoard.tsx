import { useId, useRef } from 'react';
import type { MotionRef } from '../useStoryProgress';
import { connections, evidence, routePath, routePoints } from './evidence';
import { DocumentFace, ChartFace } from './EvidencePaper';
import { evidencePose, pinPosition, threadPath } from './choreography';
import { useBoardMotion } from './useBoardMotion';

export function CaseBoard({ motion }: { motion: MotionRef }) {
  const id = useId();
  const root = useRef<SVGSVGElement>(null);
  useBoardMotion(root, motion);
  return <svg ref={root} className="case-board" viewBox="0 0 1000 800" role="img" aria-labelledby={`${id}-title ${id}-description`} data-testid="case-board">
    <title id={`${id}-title`}>پرونده‌ی کسب‌وکار؛ از اسناد پراکنده تا مسیر تصمیم</title>
    <desc id={`${id}-description`}>نور روی اسناد می‌افتد، کاغذها با پین و نخ قرمز روی بورد مرتبط می‌شوند و سه نمودار فروش، دریافت‌ها و جریان نقدی شکل می‌گیرند. مسیر پیشنهادی نمایشی: بررسی دریافت‌های معوق، اولویت‌بندی سه فاکتور، پیگیری و رسیدن به جریان نقدی روشن‌تر.</desc>
    <defs>
      <linearGradient id={`${id}-paper`} x2=".15" y2="1"><stop stopColor="#e9e5dc" /><stop offset="1" stopColor="#cfc9be" /></linearGradient>
      <radialGradient id={`${id}-pin`} cx=".3" cy=".25"><stop stopColor="#ff7980" /><stop offset=".45" stopColor="#d93442" /><stop offset="1" stopColor="#6d111b" /></radialGradient>
      <radialGradient id={`${id}-light`}><stop offset="0" stopColor="white" /><stop offset=".40" stopColor="white" stopOpacity=".97" /><stop offset=".72" stopColor="white" stopOpacity=".38" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor="#ddd6cb" stopOpacity=".09" /><stop offset=".6" stopColor="#ddd6cb" stopOpacity=".045" /><stop offset="1" stopColor="#ddd6cb" stopOpacity="0" /></radialGradient>
      <pattern id={`${id}-felt`} width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0 L7 7 M-3 4 L4 11" stroke="#b2aaa4" strokeOpacity=".038" strokeWidth=".7" /></pattern>
      <mask id={`${id}-beam`} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="800">
        <rect width="1000" height="800" fill="white" opacity=".10" data-mask-ambient />
        <circle cx="205" cy="195" r="260" fill={`url(#${id}-light)`} data-flashlight />
      </mask>
    </defs>
    <circle cx="205" cy="195" r="290" fill={`url(#${id}-glow)`} data-beam-glow />
    <g className="pin-board" opacity="0">
      <rect className="board-frame" x="55" y="96" width="890" height="598" rx="5" />
      <rect className="board-felt" x="69" y="110" width="862" height="570" rx="1" />
      <rect x="69" y="110" width="862" height="570" fill={`url(#${id}-felt)`} />
      {[[62, 104], [938, 104], [62, 686], [938, 686]].map(([x, y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><circle className="board-screw" r="3.5" /><path d="M-2 -2 L2 2" stroke="#080808" /></g>)}
      <text className="board-index" x="902" y="140">پرونده ۰۰۱ / کسب‌وکار</text>
      <text className="board-index" x="901" y="663">هر سند، بخشی از حقیقت.</text>
    </g>
    <g mask={`url(#${id}-beam)`} aria-hidden="true">
      {evidence.map((item, index) => {
        const pose = evidencePose(index, 0);
        return <g key={item.tag} className="evidence-card" data-evidence={index} transform={`translate(${pose.x} ${pose.y}) rotate(${pose.angle})`}>
          <rect className="paper-body" x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} rx="1.5" fill={`url(#${id}-paper)`} />
          <g className="evidence-document"><DocumentFace item={item} index={index} /></g>
          <g className="evidence-chart" opacity="0">{index < 3 && <ChartFace index={index} />}</g>
          <path className="paper-fold" d={`M${item.width / 2 - 15} ${item.height / 2} l15 -15 v15Z`} />
          <g className="evidence-pin" opacity="0" transform={`translate(0 ${-item.height / 2 + 7})`}>
            <path d="M0 1 l4 9" stroke="#131010" strokeWidth="3" opacity=".55" />
            <circle r="6.5" fill={`url(#${id}-pin)`} /><circle cx="-2" cy="-2" r="1.4" fill="#ffd4d6" opacity=".65" />
          </g>
        </g>;
      })}
      <g className="evidence-threads">{connections.map(([a, b], index) => <path key={`${a}-${b}`} className="evidence-thread" d={threadPath(pinPosition(evidencePose(a, 0)), pinPosition(evidencePose(b, 0)), index)} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />)}</g>
      <g className="route-map" opacity="0">
        <path className="route-track" d={routePath} />
        <path className="route-line" d={routePath} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
        {routePoints.map((point, index) => <g className="route-node" key={point.title} transform={`translate(${point.x} ${point.y})`} opacity="0">
          <circle className="route-node-outer" r={index === 3 ? 19 : 12} /><circle className="route-node-inner" r={index === 3 ? 8 : 4} />
          {index === 3 && <path d="M0 -5 V-44 M0 -43 H27 L18 -34 H0" className="destination-flag" />}
          <text className="route-node-title" textAnchor="middle" y="39">{point.title}</text>
          <text className="route-node-detail" textAnchor="middle" y="61">{point.subtitle}</text>
        </g>)}
        <g className="route-destination" opacity="0">
          <path d="M113 546 h-12 v-18 M270 546 h12 v-18 M113 637 h-12 v-18 M270 637 h12 v-18" className="destination-brackets" />
          <text x="837" y="642" className="route-legend">یک مسیر پیشنهادی، بر اساس داده‌های نمایشی</text>
        </g>
      </g>
    </g>
  </svg>;
}
