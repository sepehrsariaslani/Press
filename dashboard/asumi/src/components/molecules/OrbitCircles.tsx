export function OrbitCircles() {
	return (
		<svg aria-hidden="true" className="asumi-orbits" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900">
			<g className="asumi-orbit asumi-orbit--one" data-testid="orbit">
				<ellipse cx="798" cy="414" data-orbit-path pathLength="1" rx="310" ry="306" />
			</g>
			<g className="asumi-orbit asumi-orbit--two" data-testid="orbit">
				<ellipse cx="742" cy="402" data-orbit-path pathLength="1" rx="374" ry="346" />
			</g>
			<g className="asumi-orbit asumi-orbit--three" data-testid="orbit">
				<ellipse cx="852" cy="432" data-orbit-path pathLength="1" rx="438" ry="264" />
			</g>
		</svg>
	);
}
