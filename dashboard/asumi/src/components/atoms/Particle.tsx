type ParticleProps = {
	index: number;
};

export function Particle({ index }: ParticleProps) {
	return <span aria-hidden="true" className="asumi-particle" data-index={index} />;
}
