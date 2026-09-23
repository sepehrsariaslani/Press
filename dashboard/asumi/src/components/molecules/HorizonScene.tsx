export function HorizonScene() {
	return (
		<div aria-hidden="true" className="horizon-scene">
			<svg className="horizon-scene__svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900">
				<defs>
					<linearGradient id="horizon-light" x1="0" x2="1"><stop offset="0" stopColor="#84683d" stopOpacity="0" /><stop offset="0.5" stopColor="#f6dfb0" /><stop offset="1" stopColor="#84683d" stopOpacity="0" /></linearGradient>
					<filter id="horizontal-bloom" x="-30%" width="160%"><feGaussianBlur stdDeviation="38 5" /></filter>
				</defs>
				<g data-sun>
					<rect fill="url(#horizon-light)" filter="url(#horizontal-bloom)" height="14" opacity="0.36" width="760" x="420" y="672" />
					<ellipse cx="800" cy="712" fill="#c8a66a" filter="url(#horizontal-bloom)" opacity="0.34" rx="24" ry="126" />
					<circle cx="800" cy="678" fill="#fff4d4" r="4.5" />
				</g>
			</svg>
		</div>
	);
}
