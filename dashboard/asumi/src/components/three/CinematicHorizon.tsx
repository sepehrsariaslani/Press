import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const gold = new THREE.Color('#c8a66a');
const brightGold = new THREE.Color('#ffd58c');

function Sun() {
	const glow = useRef<THREE.Mesh>(null);
	const reflection = useRef<THREE.Mesh>(null);

	useFrame(({ clock }) => {
		const pulse = 1 + Math.sin(clock.elapsedTime * 0.7) * 0.035;
		glow.current?.scale.setScalar(pulse);
		if (reflection.current) reflection.current.scale.y = 1 + Math.sin(clock.elapsedTime * 0.45) * 0.08;
	});

	return (
		<group position={[0, -1.55, 0]}>
			<pointLight color={brightGold} distance={8} intensity={24} position={[0, 0.1, 1]} />
			<mesh>
				<sphereGeometry args={[0.075, 32, 32]} />
				<meshBasicMaterial color={brightGold} toneMapped={false} />
			</mesh>
			<mesh ref={glow}>
				<circleGeometry args={[0.82, 64]} />
				<meshBasicMaterial blending={THREE.AdditiveBlending} color={gold} depthWrite={false} opacity={0.16} transparent />
			</mesh>
			<mesh position={[0, -0.6, -0.2]} ref={reflection} rotation={[0, 0, Math.PI / 2]} scale={[1, 2.4, 1]}>
				<planeGeometry args={[0.75, 0.025]} />
				<meshBasicMaterial blending={THREE.AdditiveBlending} color={brightGold} depthWrite={false} opacity={0.25} transparent />
			</mesh>
		</group>
	);
}

function OrbitRings() {
	const group = useRef<THREE.Group>(null);
	useFrame(({ clock }) => {
		if (!group.current) return;
		const reveal = THREE.MathUtils.smoothstep(clock.elapsedTime, 0.8, 2.2);
		group.current.rotation.z = clock.elapsedTime * 0.012;
		group.current.scale.setScalar(0.92 + reveal * 0.08);
		group.current.traverse((object) => {
			if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
				object.material.opacity = Number(object.userData.opacity) * reveal;
			}
		});
	});

	return (
		<group position={[0, 0.15, -1.2]} ref={group}>
			{[
				[2.55, 1, 0.18],
				[3.2, 0.82, 0.1],
				[3.85, 0.67, 0.06],
			].map(([radius, scaleY, opacity], index) => (
				<mesh key={radius} rotation={[0, 0, index * 0.18]} scale={[1, scaleY, 1]} userData={{ opacity }}>
					<torusGeometry args={[radius, 0.006, 4, 180]} />
					<meshBasicMaterial blending={THREE.AdditiveBlending} color={gold} depthWrite={false} opacity={opacity} transparent />
				</mesh>
			))}
		</group>
	);
}

function LightRibbons() {
	const group = useRef<THREE.Group>(null);
	const ribbons = useMemo(() => {
		const paths = [
			[[-0.4, -1.63, 0], [1.2, -1.45, 0], [2.2, -0.35, -0.2], [3.4, -1.2, -0.5], [5.5, 0.45, -1]],
			[[-0.8, -1.72, -0.4], [1.1, -1.65, -0.2], [2.5, -0.7, -0.3], [3.9, -1.05, -0.8], [5.7, -0.25, -1.3]],
			[[-1.2, -1.5, -0.7], [0.8, -1.58, -0.5], [2.1, -1.0, -0.4], [4.2, 0.1, -1.1], [6.2, 1.25, -1.5]],
		];
		return paths.map((points) => new THREE.TubeGeometry(
			new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
			120,
			0.012,
			6,
			false,
		));
	}, []);

	useFrame(({ clock }) => {
		if (!group.current) return;
		const reveal = THREE.MathUtils.smoothstep(clock.elapsedTime, 2.25, 3.75);
		group.current.rotation.z = Math.sin(clock.elapsedTime * 0.23) * 0.018;
		group.current.position.y = (1 - reveal) * 0.35 + Math.sin(clock.elapsedTime * 0.32) * 0.035;
		group.current.traverse((object) => {
			if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
				object.material.opacity = Number(object.userData.opacity) * reveal;
			}
		});
	});

	return (
		<group ref={group}>
			{ribbons.map((geometry, index) => (
				<mesh geometry={geometry} key={index} userData={{ opacity: 0.5 - index * 0.12 }}>
					<meshBasicMaterial blending={THREE.AdditiveBlending} color={index === 0 ? brightGold : gold} depthWrite={false} opacity={0.5 - index * 0.12} transparent />
				</mesh>
			))}
		</group>
	);
}

function GoldenParticles() {
	const points = useRef<THREE.Points>(null);
	const positions = useMemo(() => {
		const data = new Float32Array(180 * 3);
		for (let index = 0; index < 180; index += 1) {
			const side = index % 3 === 0 ? -1 : 1;
			data[index * 3] = side * (0.2 + Math.random() * 5.6);
			data[index * 3 + 1] = -1.75 + Math.random() * 2.5;
			data[index * 3 + 2] = -1.8 + Math.random() * 2;
		}
		return data;
	}, []);

	useFrame(({ clock }) => {
		if (!points.current) return;
		points.current.rotation.z = Math.sin(clock.elapsedTime * 0.1) * 0.02;
		if (points.current.material instanceof THREE.PointsMaterial) {
			points.current.material.opacity = 0.55 * THREE.MathUtils.smoothstep(clock.elapsedTime, 2.8, 4.2);
		}
	});

	return (
		<points ref={points}>
			<bufferGeometry>
				<bufferAttribute args={[positions, 3]} attach="attributes-position" />
			</bufferGeometry>
			<pointsMaterial blending={THREE.AdditiveBlending} color={brightGold} depthWrite={false} opacity={0.55} size={0.018} sizeAttenuation transparent />
		</points>
	);
}

export function CinematicHorizon() {
	const scene = useRef<THREE.Group>(null);
	const { camera, pointer } = useThree();

	useFrame((state, delta) => {
		camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.28, 3.4, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, pointer.y * 0.16, 3.4, delta);
		camera.lookAt(0, -0.2, 0);
		if (scene.current) scene.current.rotation.y = THREE.MathUtils.damp(scene.current.rotation.y, pointer.x * 0.025, 3, delta);
		state.gl.toneMappingExposure = 1.08;
	});

	return (
		<group ref={scene}>
			<ambientLight intensity={0.15} />
			<OrbitRings />
			<LightRibbons />
			<GoldenParticles />
			<Sun />
		</group>
	);
}
