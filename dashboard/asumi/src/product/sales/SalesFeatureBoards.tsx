import { salesFeatureBoards } from './salesProductData';
import './sales-feature-boards.css';

function makeTrendPath(values: readonly number[]) {
	const width = 164;
	const height = 35;
	const step = width / Math.max(values.length - 1, 1);
	return values.map((value, index) => {
		const x = 8 + index * step;
		const y = height - 4 - (value / 100) * (height - 8);
		return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
	}).join(' ');
}

function SalesPaper({ paper, index }: { paper: (typeof salesFeatureBoards)[number]['papers'][number]; index: number }) {
	return <li className="sales-paper-slot">
		<a className="sales-feature-paper" href={`/hesab${paper.path}`} data-sales-paper={paper.id}>
			<span className="sales-paper-pin" aria-hidden="true" />
			<span className="sales-paper-topline">
				<small dir="auto">{paper.source}</small>
				<span aria-hidden="true">برگ {`${index + 1}`.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])}</span>
			</span>
			<h5>{paper.title}</h5>
			<p className="sales-paper-description">{paper.description}</p>
			{paper.chart && <svg className="sales-paper-chart" viewBox="0 0 180 48" role="img" aria-label={paper.chart.label}>
				<path className="sales-chart-gridline" d="M4 10 H176 M4 24 H176 M4 38 H176" />
				<path className="sales-chart-area" d={`${makeTrendPath(paper.chart.values)} L172 43 L8 43 Z`} />
				<path className="sales-chart-trend" d={makeTrendPath(paper.chart.values)} />
				{paper.chart.values.map((value, pointIndex) => {
					const x = 8 + pointIndex * (164 / Math.max(paper.chart!.values.length - 1, 1));
					const y = 35 - 4 - (value / 100) * 27;
					return <circle className="sales-chart-point" key={`${pointIndex}-${value}`} cx={x} cy={y} r="2" />;
				})}
			</svg>}
			<dl className="sales-paper-fields">
				{paper.fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
			</dl>
			<span className="sales-paper-stamp">{paper.stamp}</span>
			<span className="sales-paper-action">بازکردن مسیر <span aria-hidden="true">↗</span></span>
		</a>
	</li>;
}

function BoardConnector({ label, index }: { label: string; index: number }) {
	return <div className="sales-board-bridge" data-sales-board-connector={index}>
		<svg viewBox="0 0 100 56" aria-hidden="true" focusable="false">
			<path d="M50 0 C51 13 46 18 50 28 C54 39 49 44 50 56" />
			<circle cx="50" cy="7" r="4" />
			<circle cx="50" cy="49" r="4" />
		</svg>
		<p><span>نخ اتصال</span>{label}</p>
	</div>;
}

export function SalesFeatureBoards() {
	return <div className="sales-board-wall" aria-label="چهار بورد متصل از امکانات فروش آسومی">
		<div className="sales-board-wall-note"><span className="sales-board-wall-pin" aria-hidden="true" />کاغذها سندها و قابلیت‌های برنامه را نشان می‌دهند؛ نخ قرمز، ارتباط هر مرحله را با مرحله‌ی بعد مشخص می‌کند.</div>
		{salesFeatureBoards.map((board, boardIndex) => <div className="sales-board-sequence-item" key={board.id}>
			<section className="sales-caseboard" id={`sales-board-${board.id}`} data-sales-board={board.id} aria-labelledby={`sales-board-${board.id}-title`}>
				<header className="sales-caseboard-header">
					<span className="sales-caseboard-number">{board.number}</span>
					<div>
						<p>بورد پرونده‌ی فروش</p>
						<h4 id={`sales-board-${board.id}-title`}>{board.title}</h4>
						<span>{board.description}</span>
					</div>
					<span className="sales-caseboard-code">پرونده‌ی AS · ۱۴۰۵</span>
				</header>
				<div className="sales-corkboard">
					<div className="sales-corkboard-label"><span>ASUMI · SALES FILE</span><span>{board.number} / ۰۴</span></div>
					<div className="sales-paper-grid" aria-label={`کاغذهای بورد ${board.title}`}>
						<svg className="sales-paper-threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
							<path d="M75 25 C60 12 40 12 25 25 C11 41 11 59 25 75 C40 88 60 88 75 75" />
							<circle cx="75" cy="25" r="1.4" /><circle cx="25" cy="25" r="1.4" />
							<circle cx="25" cy="75" r="1.4" /><circle cx="75" cy="75" r="1.4" />
						</svg>
						<ol>
							{board.papers.map((paper, paperIndex) => <SalesPaper key={paper.id} paper={paper} index={paperIndex} />)}
						</ol>
					</div>
					{board.destinations.length > 0 && <nav className="sales-board-destinations" aria-label={`ارتباط بورد ${board.title} با ماژول‌های دیگر`}>
						<span>رشته‌های متصل به</span>
						{board.destinations.map(destination => <a key={`${destination.module}-${destination.path}`} href={`/hesab${destination.path}`}>
							<strong>{destination.module}</strong><span>{destination.description}</span><span className="sales-destination-arrow" aria-hidden="true">↗</span>
						</a>)}
					</nav>}
				</div>
			</section>
			{boardIndex < salesFeatureBoards.length - 1 && <BoardConnector label={board.connector} index={boardIndex + 1} />}
		</div>)}
	</div>;
}
