import { Canvas } from '@react-three/fiber';
import { CinematicHorizon } from './CinematicHorizon';

type AsumiCanvasProps = {
	onReady: () => void;
};

export default function AsumiCanvas({ onReady }: AsumiCanvasProps) {
	return (
		<Canvas
			camera={{ far: 40, fov: 42, near: 0.1, position: [0, 0, 8] }}
			dpr={[1, 1.5]}
			gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
			onCreated={onReady}
		>
			<CinematicHorizon />
		</Canvas>
	);
}
