export function HorizonScene() {
	return (
		<div aria-hidden="true" className="horizon-scene">
			<svg className="horizon-scene__svg" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900">
				<defs>
					<linearGradient id="horizon-light" x1="0" x2="1"><stop offset="0" stopColor="#84683d" stopOpacity="0" /><stop offset="0.5" stopColor="#f6dfb0" /><stop offset="1" stopColor="#84683d" stopOpacity="0" /></linearGradient>
					<radialGradient id="flare-ghost"><stop offset="0" stopColor="#d8d8cd" stopOpacity="0.025" /><stop offset="0.68" stopColor="#a98248" stopOpacity="0.035" /><stop offset="0.84" stopColor="#e2bd76" stopOpacity="0.14" /><stop offset="1" stopColor="#a98248" stopOpacity="0" /></radialGradient>
					<filter id="horizontal-bloom" x="-30%" width="160%"><feGaussianBlur stdDeviation="38 5" /></filter>
				</defs>
				<g data-sun>
					<rect fill="url(#horizon-light)" filter="url(#horizontal-bloom)" height="14" opacity="0.52" width="760" x="420" y="672" />
					<ellipse cx="800" cy="730" fill="#c8a66a" filter="url(#horizontal-bloom)" opacity="0.24" rx="17" ry="92" />
					<circle cx="800" cy="678" fill="#fff4d4" r="3.5" />
				</g>
				<g data-lens-flare>
					<circle cx="545" cy="392" fill="url(#flare-ghost)" r="135" />
					<circle cx="675" cy="515" fill="url(#flare-ghost)" opacity="0.86" r="82" />
					<circle cx="860" cy="744" fill="url(#flare-ghost)" opacity="0.68" r="38" />
					<path d="M690 568 L910 788 M715 780 L885 576" opacity="0.22" stroke="url(#horizon-light)" strokeWidth="1" />
				</g>
			</svg>
		</div>
	);
}
