import { procurementFeatureBoards } from './storyData';

function ProcurementPaper({ paper, index }: { paper: (typeof procurementFeatureBoards)[number]['papers'][number]; index: number }) {
	return <li className="procurement-paper-slot">
		<a className="procurement-feature-paper" href={`/hesab${paper.path}`} data-procurement-paper={paper.id}>
			<span className="procurement-feature-pin" aria-hidden="true" />
			<span className="procurement-paper-topline"><small dir="auto">{paper.source}</small><span>برگ {'۰۱۲۳۴۵۶۷۸۹'[index]}</span></span>
			<h4>{paper.title}</h4>
			<p>{paper.description}</p>
			<dl>{paper.fields.map((field, fieldIndex) => <div key={`${field.label}-${fieldIndex}`}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
			<span className="procurement-feature-stamp">{paper.stamp}</span>
			<span className="procurement-paper-action">بازکردن مسیر <span aria-hidden="true">↗</span></span>
		</a>
	</li>;
}

function ProcurementBoardConnector({ label, index }: { label: string; index: number }) {
	return <div className="procurement-board-bridge" data-procurement-bridge={index}>
		<svg viewBox="0 0 100 54" aria-hidden="true" focusable="false"><path d="M50 0 C48 13 54 20 50 27 C46 36 52 42 50 54" /><circle cx="50" cy="7" r="3.5" /><circle cx="50" cy="47" r="3.5" /></svg>
		<p><span>رشته‌ی اتصال</span>{label}</p>
	</div>;
}

export function ProcurementFeatureBoards() {
	return <div className="procurement-board-wall" aria-label="پنج بورد متصل از امکانات خرید و تدارکات آسومی">
		<p className="procurement-board-wall-note"><span aria-hidden="true" />هر برگ یک سند یا قابلیت است؛ رشته‌ی قرمز، ادامه‌ی همان پرونده را میان بوردها نشان می‌دهد.</p>
		{procurementFeatureBoards.map((board, boardIndex) => <div className="procurement-board-sequence-item" key={board.id}>
			<section className="procurement-caseboard" id={`procurement-board-${board.id}`} data-procurement-board={board.id} aria-labelledby={`procurement-board-${board.id}-title`}>
				<header className="procurement-caseboard-header">
					<span className="procurement-caseboard-number">{board.number}</span>
					<div><p>بورد پرونده‌ی خرید</p><h3 id={`procurement-board-${board.id}-title`}>{board.title}</h3><span>{board.description}</span></div>
					<span className="procurement-caseboard-code">AS · PURCHASE</span>
				</header>
				<div className="procurement-corkboard">
					<div className="procurement-corkboard-label"><span>ASUMI · BUYING FILE</span><span>{board.number} / ۰۵</span></div>
					<div className="procurement-paper-grid">
						<svg className="procurement-paper-threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M75 25 C60 12 40 12 25 25 C11 41 11 59 25 75 C40 88 60 88 75 75" /><circle cx="75" cy="25" r="1.35" /><circle cx="25" cy="25" r="1.35" /><circle cx="25" cy="75" r="1.35" /><circle cx="75" cy="75" r="1.35" /></svg>
						<ol>{board.papers.map((paper, index) => <ProcurementPaper key={paper.id} paper={paper} index={index} />)}</ol>
					</div>
				</div>
			</section>
			{boardIndex < procurementFeatureBoards.length - 1 && <ProcurementBoardConnector label={board.connector} index={boardIndex + 1} />}
		</div>)}
	</div>;
}
