import type { Evidence } from './evidence';

export function DocumentFace({ item, index }: { item: Evidence; index: number }) {
  const width = item.width, height = item.height;
  const note = index > 5;
  return <g className="document-face" transform={`translate(${-width / 2} ${-height / 2})`}>
    <text className="paper-tag" x={width - 14} y="29">{item.tag}</text>
    <text className="paper-title" x={width - 14} y="54">{item.title}</text>
    {!note && <>
      <path className="paper-rule" d={`M14 67 H${width - 14}`} />
      {[0, 1, 2, 3].map(row => <g key={row} opacity={.78 - row * .08}>
        <path className="paper-text-line" d={`M${width * .40 + (row % 2) * 9} ${83 + row * 15} H${width - 15}`} />
        <path className="paper-text-line" d={`M15 ${83 + row * 15} H${width * .25}`} />
      </g>)}
      {index === 0 && <g className="paper-stamp" transform={`translate(45 ${height - 64}) rotate(-12)`}><rect x="-30" y="-13" width="60" height="26" rx="1" /><text textAnchor="middle" y="5">بررسی شود</text></g>}
      <text className="paper-value" x={width - 14} y={height - 35}>{item.value}</text>
      <text className="paper-note" x={width - 14} y={height - 16}>{item.note}</text>
    </>}
    {note && <text className="paper-question" textAnchor="middle" x={width / 2} y={height - 17}>{item.value}</text>}
  </g>;
}

export function ChartFace({ index }: { index: number }) {
  const titles = ['روند فروش', 'وضعیت دریافت‌ها', 'جریان نقدی'];
  return <g className="chart-face" transform="translate(-112.5 -89)">
    <text className="chart-heading" x="208" y="31">{titles[index]}</text>
    <text className="chart-value" x="208" y="57">{['۲۴۸ میلیون ریال', '۸۷٪ دریافت‌شده', '۱۸۶ میلیون ریال'][index]}</text>
    {index === 0 && <g>
      {[0, 1, 2].map(i => <path key={i} className="chart-grid" d={`M20 ${83 + i * 32} H207`} />)}
      {[25, 36, 30, 48, 43, 65, 74].map((height, i) => <rect key={i} x={22 + i * 27} y={150 - height} width="16" height={height} rx="1" fill={i > 4 ? 'var(--case-red)' : '#77716e'} />)}
    </g>}
    {index === 1 && <g transform="translate(113 111)">
      <circle r="35" fill="none" stroke="#c7c0b9" strokeWidth="11" />
      <circle r="35" fill="none" stroke="var(--case-red)" strokeWidth="11" pathLength="100" strokeDasharray="87 100" transform="rotate(-90)" />
      <text className="chart-percentage" textAnchor="middle" y="7">۸۷٪</text>
    </g>}
    {index === 2 && <g>
      {[0, 1, 2].map(i => <path key={i} className="chart-grid" d={`M20 ${83 + i * 32} H207`} />)}
      <path d="M22 141 L49 130 L76 138 L103 111 L130 119 L158 89 L183 98 L207 76 L207 153 H22Z" fill="var(--case-red)" opacity=".08" />
      <path d="M22 141 L49 130 L76 138 L103 111 L130 119 L158 89 L183 98 L207 76" stroke="var(--case-red)" strokeWidth="3" fill="none" />
      <circle cx="207" cy="76" r="4" fill="var(--case-red)" />
    </g>}
    <text className="chart-caption" x="208" y="168">این ماه · داده‌ی نمایشی</text>
  </g>;
}
