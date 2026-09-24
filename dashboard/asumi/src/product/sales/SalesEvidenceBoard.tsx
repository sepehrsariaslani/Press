import { useEffect, useId, useRef } from 'react';
import type { MotionRef } from '../../story/useStoryProgress';
import { chapterAt, clamp, lerp, transition } from '../../story/chapters';
import { pointerToScene, threadPath } from '../../story/board/choreography';
import { salesSample, salesQuote } from './storyData';

const persianDigits = (value: number | string) => String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);

const obligations = [
	{ id: 'inventory', x: 205, y: 323, title: 'موجودی', question: '۱۲۰ عدد آماده', note: 'انبار · نمونه' },
	{ id: 'delivery', x: 795, y: 323, title: 'زمان تحویل', question: salesSample.deliveryTime, note: 'برنامه‌ریزی‌شده' },
	{ id: 'shipment', x: 205, y: 584, title: 'ارسال', question: 'آماده‌ی ثبت', note: 'تحویل به مشتری' },
	{ id: 'finance', x: 795, y: 584, title: 'پرداخت', question: `${persianDigits(salesSample.advancePercent)}٪ پیش‌پرداخت`, note: 'دریافت‌شده · نمونه' },
] as const;

const opacity = (element: SVGElement | null, value: number) => element?.setAttribute('opacity', value.toFixed(3));

function ObligationPaper({ item, paperId }: { item: (typeof obligations)[number]; paperId: string }) {
	return <g data-obligation={item.id} opacity="0" transform={`translate(${item.x} ${item.y})`}>
		<rect className="paper-body sales-obligation-paper" x="-112" y="-57" width="224" height="114" rx="1.5" fill={`url(#${paperId})`} />
		<g className="sales-paper-face document-face">
			<text className="paper-tag" textAnchor="end" x="96" y="-32">پرونده‌ی سفارش</text>
			<text className="paper-title" textAnchor="end" x="96" y="-8">{item.title}</text>
			<path className="paper-rule" d="M-96 4 H96" />
			<text className="paper-value" textAnchor="end" x="96" y="29">{item.question}</text>
			<text className="paper-note" textAnchor="end" x="96" y="45">{item.note}</text>
		</g>
		<g className="sales-evidence-pin" transform="translate(0 -50)"><path d="M0 1 l4 9" stroke="#131010" strokeWidth="3" opacity=".55" /><circle r="6.5" fill="url(#sales-board-pin)" /><circle cx="-2" cy="-2" r="1.4" fill="#ffd4d6" opacity=".65" /></g>
	</g>;
}

export function SalesEvidenceBoard({ motion, stage }: { motion: MotionRef; stage: number }) {
	const id = useId().replaceAll(':', '');
	const root = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const svg = root.current;
		if (!svg) return;
		const board = svg.querySelector<SVGGElement>('[data-sales-board]');
		const camera = svg.querySelector<SVGGElement>('[data-sales-camera]');
		const request = svg.querySelector<SVGGElement>('[data-sales-item="request"]');
		const requestDetails = svg.querySelector<SVGGElement>('[data-request-details]');
		const quote = svg.querySelector<SVGGElement>('[data-sales-item="quote"]');
		const quoteFields = svg.querySelector<SVGGElement>('[data-quote-fields]');
		const quoteTotal = svg.querySelector<SVGGElement>('[data-quote-total]');
		const quoteSent = svg.querySelector<SVGGElement>('[data-quote-sent]');
		const accepted = svg.querySelector<SVGGElement>('[data-accepted-stamp]');
		const orderNumber = svg.querySelector<SVGTextElement>('[data-order-number]');
		const obligations = Array.from(svg.querySelectorAll<SVGGElement>('[data-obligation]'));
		const threads = Array.from(svg.querySelectorAll<SVGPathElement>('[data-sales-thread]'));
		const ambient = svg.querySelector<SVGRectElement>('[data-sales-ambient]');
		const flashlight = svg.querySelector<SVGCircleElement>('[data-sales-flashlight]');
		const glow = svg.querySelector<SVGCircleElement>('[data-sales-glow]');
		let bounds = svg.getBoundingClientRect();
		let frame = 0;
		let previousTime = 0;
		let progress = motion.current.progress;
		let pointer = { x: 500, y: 340 };
		let beam = { ...pointer };
		let pointerActive = false;

		const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
		const draw = (time: number) => {
			frame = 0;
			const reduced = motion.current.reducedMotion;
			const raw = clamp(motion.current.progress);
			const target = reduced ? chapterAt(raw) / 5 : raw;
			const factor = reduced ? 1 : 1 - Math.exp(-Math.min(time - previousTime || 16, 64) / 75);
			previousTime = time;
			progress = Math.abs(target - progress) < .0001 ? target : lerp(progress, target, factor);

			const boardReveal = transition(.08, .27, progress);
			const requestScale = lerp(.52, 1, transition(.015, .22, progress));
			const requestY = lerp(350, 196, transition(.16, .34, progress));
			request?.setAttribute('transform', `translate(500 ${requestY}) rotate(${lerp(-2, -0.5, transition(.16, .3, progress))}) scale(${requestScale})`);
			opacity(request, 1);
			opacity(requestDetails, transition(.095, .25, progress));

			const quoteReveal = transition(.22, .39, progress);
			const quoteSettle = transition(.34, .52, progress);
			quote?.setAttribute('transform', `translate(500 ${lerp(408, 450, quoteSettle)}) rotate(${lerp(1.3, 0, quoteSettle)}) scale(${lerp(.72, 1, quoteReveal)})`);
			opacity(quote, quoteReveal);
			opacity(quoteFields, transition(.27, .44, progress));
			opacity(quoteTotal, transition(.35, .49, progress));
			opacity(quoteSent, transition(.445, .54, progress) * (1 - transition(.54, .64, progress)));
			opacity(accepted, transition(.535, .65, progress));
			opacity(orderNumber, transition(.61, .7, progress));

			const pullback = transition(.58, .77, progress);
			const zoom = lerp(1.19, 1, pullback);
			camera?.setAttribute('transform', `translate(${500 * (1 - zoom)} ${400 * (1 - zoom)}) scale(${zoom})`);
			opacity(board, boardReveal);
			obligations.forEach((item, index) => {
				const shown = transition(.635 + index * .028, .755 + index * .028, progress);
				opacity(item, shown);
				const original = obligationsData[index];
				item.setAttribute('transform', `translate(${original.x} ${lerp(original.y + 19, original.y, shown)}) scale(${lerp(.94, 1, shown)})`);
			});
			threads.forEach((path, index) => {
				const start = index === 0 ? { x: 500, y: 341 } : { x: 500, y: 341 };
				const end = index === 0 ? { x: 500, y: 127 } : obligationPins[index - 1];
				path.setAttribute('d', index === 0 ? threadPath(end, start, index) : threadPath(start, end, index));
				const reveal = index === 0 ? transition(.29, .44, progress) : transition(.69 + index * .024, .82 + index * .024, progress);
				path.setAttribute('stroke-dashoffset', String(1 - reveal));
				opacity(path, index === 0 ? .9 : .8);
			});

			const noticeActive = progress < .11 && !reduced;
			svg.dataset.noticeActive = String(noticeActive);
			svg.dataset.progress = progress.toFixed(3);
			svg.dataset.stage = String(stage);
			const spotlightOn = !reduced && progress < .31;
			const targetBeam = pointerActive && spotlightOn ? pointer : { x: lerp(500, 280, transition(.03, .28, progress)), y: lerp(340, 210, transition(.03, .28, progress)) };
			beam = { x: lerp(beam.x, targetBeam.x, factor), y: lerp(beam.y, targetBeam.y, factor) };
			if (flashlight) { flashlight.setAttribute('cx', String(beam.x)); flashlight.setAttribute('cy', String(beam.y)); }
			if (glow) { glow.setAttribute('cx', String(beam.x)); glow.setAttribute('cy', String(beam.y)); }
			opacity(ambient, reduced ? 1 : lerp(.08, 1, boardReveal));
			opacity(glow, spotlightOn ? .36 : 0);
			svg.dataset.flashlight = String(spotlightOn);
			if (Math.abs(target - progress) > .0001 || Math.abs(targetBeam.x - beam.x) + Math.abs(targetBeam.y - beam.y) > .25) schedule();
		};

		const onPointer = (event: PointerEvent) => {
			if (event.pointerType === 'touch' || motion.current.reducedMotion || motion.current.progress > .31) { pointerActive = false; schedule(); return; }
			pointerActive = true;
			pointer = pointerToScene(event.clientX, event.clientY, bounds);
			schedule();
		};
		const onLeave = (event: Event) => {
			if ('relatedTarget' in event && event.relatedTarget) return;
			pointerActive = false;
			schedule();
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
			cancelAnimationFrame(frame);
			observer?.disconnect();
			if (motion.current.invalidate === schedule) motion.current.invalidate = undefined;
			window.removeEventListener('pointermove', onPointer);
			window.removeEventListener('pointerout', onLeave);
			window.removeEventListener('blur', onLeave);
			window.removeEventListener('resize', measure);
		};
	}, [motion, stage]);

	return <svg ref={root} className="case-board sales-case-board" viewBox="0 0 1000 800" role="img" aria-labelledby={`${id}-title ${id}-description`} data-testid="sales-evidence-board">
		<title id={`${id}-title`}>پرونده‌ی فروش آسومی؛ از درخواست مشتری تا سفارش و تحویل</title>
		<desc id={`${id}-description`}>یک اعلان کوچک باز می‌شود و درخواست قیمت ۱۲۰ عدد از کد A را نشان می‌دهد. درخواست به پیشنهاد قیمت، تأیید مشتری و سفارش فروش تبدیل می‌شود. با عقب‌رفتن صحنه، اسناد موجودی، زمان تحویل، ارسال و پرداخت روی بورد پین می‌شوند و با نخ‌های قرمز به همان سفارش وصل می‌مانند.</desc>
		<defs>
			<linearGradient id={`${id}-paper`} x2=".15" y2="1"><stop stopColor="#e9e5dc" /><stop offset="1" stopColor="#cfc9be" /></linearGradient>
			<radialGradient id={`${id}-pin`} cx=".3" cy=".25"><stop stopColor="#ff7980" /><stop offset=".45" stopColor="#d93442" /><stop offset="1" stopColor="#6d111b" /></radialGradient>
			<radialGradient id={`${id}-light`}><stop offset="0" stopColor="white" /><stop offset=".40" stopColor="white" stopOpacity=".97" /><stop offset=".72" stopColor="white" stopOpacity=".38" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
			<radialGradient id={`${id}-glow`}><stop stopColor="#ddd6cb" stopOpacity=".09" /><stop offset=".6" stopColor="#ddd6cb" stopOpacity=".045" /><stop offset="1" stopColor="#ddd6cb" stopOpacity="0" /></radialGradient>
			<pattern id={`${id}-felt`} width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0 L7 7 M-3 4 L4 11" stroke="#b2aaa4" strokeOpacity=".038" strokeWidth=".7" /></pattern>
			<mask id={`${id}-beam`} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="800">
				<rect data-sales-ambient width="1000" height="800" fill="white" opacity=".08" />
				<circle data-sales-flashlight cx="500" cy="340" r="270" fill={`url(#${id}-light)`} />
			</mask>
			<linearGradient id="sales-board-pin" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ff7980" /><stop offset=".55" stopColor="#d93442" /><stop offset="1" stopColor="#6d111b" /></linearGradient>
		</defs>
		<circle data-sales-glow cx="500" cy="340" r="310" fill={`url(#${id}-glow)`} />
		<g data-sales-camera mask={`url(#${id}-beam)`} aria-hidden="true">
			<g data-sales-board opacity="0">
				<rect className="board-frame" x="55" y="96" width="890" height="598" rx="5" />
				<rect className="board-felt" x="69" y="110" width="862" height="570" rx="1" />
				<rect x="69" y="110" width="862" height="570" fill={`url(#${id}-felt)`} />
				{[[62, 104], [938, 104], [62, 686], [938, 686]].map(([x, y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><circle className="board-screw" r="3.5" /><path d="M-2 -2 L2 2" stroke="#080808" /></g>)}
				<text className="board-index" x="902" y="140">پرونده‌ی فروش / سفارش</text>
				<text className="board-index" x="901" y="663">هر مرحله، یک تعهد تازه.</text>
			</g>
			<g className="sales-board-threads">
				{Array.from({ length: 5 }, (_, index) => <path key={index} className="evidence-thread" data-sales-thread={index} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />)}
			</g>
			<g data-sales-item="request" transform="translate(500 350) scale(.52)">
				<rect className="paper-body sales-request-paper" x="-155" y="-75" width="310" height="150" rx="1.5" fill={`url(#${id}-paper)`} />
				<g className="sales-paper-face document-face">
					<text className="paper-tag" textAnchor="end" x="132" y="-48">درخواست تازه</text>
					<text className="paper-title" textAnchor="end" x="132" y="-22">پیام مشتری</text>
					<g data-request-details opacity="0">
						<path className="paper-rule" d="M-132 -9 H132" />
						<text className="paper-value" textAnchor="end" x="132" y="17">سلام، برای ۱۲۰ عدد</text>
						<text className="paper-value" textAnchor="end" x="132" y="39">از کد A قیمت می‌خواستم.</text>
						<text className="paper-note" textAnchor="end" x="132" y="61">مشتری نمونه · ۰۹:۴۲</text>
					</g>
					<g className="sales-notification-badge"><circle className="sales-notification-ping" cx="-132" cy="-54" r="5" /></g>
				</g>
				<g className="sales-evidence-pin" transform="translate(0 -68)"><path d="M0 1 l4 9" stroke="#131010" strokeWidth="3" opacity=".55" /><circle r="6.5" fill={`url(#${id}-pin)`} /><circle cx="-2" cy="-2" r="1.4" fill="#ffd4d6" opacity=".65" /></g>
			</g>
			<g data-sales-item="quote" opacity="0" transform="translate(500 408) scale(.72)">
				<rect className="paper-body sales-quote-paper" x="-170" y="-115" width="340" height="230" rx="1.5" fill={`url(#${id}-paper)`} />
				<g className="sales-paper-face document-face">
					<text className="paper-tag" textAnchor="end" x="147" y="-88">پیشنهاد قیمت · پیش‌نمایش نمونه</text>
					<text className="paper-title" textAnchor="end" x="147" y="-64">پیش‌فاکتور</text>
					<path className="paper-rule" d="M-147 -52 H147" />
					<g data-quote-fields opacity="0">
						<text className="paper-note" textAnchor="end" x="147" y="-31">مشتری نمونه</text>
						<text className="paper-value" textAnchor="end" x="147" y="-8">کد A × ۱۲۰ عدد</text>
						<text className="paper-note" textAnchor="end" x="147" y="15">قیمت واحد · {new Intl.NumberFormat('fa-IR').format(salesSample.unitPrice)} تومان</text>
						<text className="paper-note" textAnchor="end" x="147" y="37">تخفیف · {salesSample.discountPercent}٪</text>
						<text className="paper-note" textAnchor="end" x="147" y="59">تحویل · {salesSample.deliveryTime}</text>
					</g>
					<g data-quote-total opacity="0">
						<path className="paper-rule" d="M-147 71 H147" />
						<text className="paper-tag" textAnchor="end" x="147" y="95">جمع پس از تخفیف</text>
						<text className="paper-value sales-quote-total-value" textAnchor="middle" x="-15" y="95">{new Intl.NumberFormat('fa-IR').format(salesQuote.total)} تومان</text>
					</g>
					<g data-quote-sent opacity="0" transform="translate(-65 78) rotate(-7)"><rect x="-53" y="-12" width="106" height="24" fill="none" stroke="#a92532" strokeWidth="1.7" /><text className="sales-stamp-text" textAnchor="middle" y="5">پیشنهاد ارسال شد</text></g>
				</g>
				<g className="sales-evidence-pin" transform="translate(0 -107)"><path d="M0 1 l4 9" stroke="#131010" strokeWidth="3" opacity=".55" /><circle r="6.5" fill={`url(#${id}-pin)`} /><circle cx="-2" cy="-2" r="1.4" fill="#ffd4d6" opacity=".65" /></g>
				<g data-accepted-stamp opacity="0" transform="translate(-45 73) rotate(-10)"><rect x="-47" y="-13" width="94" height="26" fill="none" stroke="#a92532" strokeWidth="2" /><text className="sales-stamp-text" textAnchor="middle" y="6">تأیید شد</text></g>
				<text className="sales-order-number" data-order-number textAnchor="start" x="-145" y="-87" opacity="0">SO-1405-00291</text>
			</g>
			{obligations.map(item => <ObligationPaper key={item.id} item={item} paperId={`${id}-paper`} />)}
		</g>
	</svg>;
}

const obligationsData = obligations;
const obligationPins = obligations.map(item => ({ x: item.x, y: item.y - 50 }));
