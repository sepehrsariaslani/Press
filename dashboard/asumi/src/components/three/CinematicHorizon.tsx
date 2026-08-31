import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const gold = new THREE.Color('#c8a66a');
const paleGold = new THREE.Color('#f6dfb0');

const horizonVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const horizonFragment = `
precision highp float;
varying vec2 vUv;
uniform float uReveal;
uniform float uTime;
void main() {
  vec2 p = vec2(vUv.x - 0.5, vUv.y - 0.58);
  float core = exp(-abs(p.x) * 125.0 - abs(p.y) * 310.0);
  float line = exp(-abs(p.y) * 155.0) * exp(-abs(p.x) * 5.2);
  float haze = exp(-(p.x * p.x * 9.0 + p.y * p.y * 110.0));
  float downward = 1.0 - step(0.0, p.y);
  float reflection = exp(-abs(p.x) * 72.0) * exp(abs(p.y) * -8.0) * downward;
  reflection *= 0.55 + 0.45 * sin(p.y * 240.0 + uTime * 0.35);
  float strength = core * 1.35 + line * 0.54 + haze * 0.22 + reflection * 0.2;
  vec3 color = mix(vec3(0.42, 0.26, 0.11), vec3(1.0, 0.91, 0.72), clamp(core + line, 0.0, 1.0));
  gl_FragColor = vec4(color * strength * uReveal, clamp(strength * uReveal, 0.0, 1.0));
}`;

const fabricVertex = `
uniform float uTime;
uniform float uReveal;
uniform float uPhase;
varying vec2 vUv;
varying float vFold;
varying float vDepth;
void main() {
  vUv = uv;
  vec3 p = position;
  float fan = smoothstep(0.0, 1.0, uv.x);
  p.y *= mix(0.035, 1.0, pow(fan, 0.72));
  float slow = uTime * 0.11;
  p.y += (sin(p.x * 0.72 + slow + uPhase) * 0.32
    + sin(p.x * 1.48 + uv.y * 4.6 - slow * 0.7 + uPhase * 1.7) * 0.11
    + sin(p.x * 2.7 - uv.y * 7.0 + uPhase) * 0.035) * fan;
  p.z += sin(p.x * 0.92 + uv.y * 5.4 + slow + uPhase) * 0.52 * fan;
  p.z += cos(p.x * 1.7 - uv.y * 3.2 + uPhase) * 0.12 * fan;
  p.x = mix(position.x - 0.1, p.x, smoothstep(0.0, 0.82, uReveal));
  vFold = 0.5 + 0.5 * sin(p.x * 2.2 + p.z * 4.0 + uv.y * 8.0 + uPhase);
  vDepth = p.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const fabricFragment = `
precision highp float;
uniform float uReveal;
uniform float uOpacity;
uniform vec3 uGold;
varying vec2 vUv;
varying float vFold;
varying float vDepth;
void main() {
  float rim = max(exp(-(1.0 - vUv.y) * 24.0), exp(-vUv.y * 24.0));
  float softEdge = smoothstep(0.0, 0.12, vUv.y) * smoothstep(0.0, 0.12, 1.0 - vUv.y);
  float ends = smoothstep(0.0, 0.1, vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.x);
  float growth = 1.0 - smoothstep(uReveal - 0.12, uReveal, vUv.x);
  float foldLight = pow(vFold, 7.0) * 0.34;
  float depthLight = smoothstep(-0.35, 0.65, vDepth) * 0.15;
  vec3 graphite = vec3(0.055, 0.06, 0.058);
  vec3 body = mix(graphite, uGold * 0.56, clamp(foldLight + depthLight, 0.0, 0.58));
  vec3 color = body + uGold * rim * 1.2 + uGold * foldLight * 1.15;
  float alpha = (0.14 + foldLight * 0.62 + rim * 0.68) * softEdge * ends * growth * uOpacity;
  gl_FragColor = vec4(color, alpha);
}`;

function HorizonLight() {
	const material = useRef<THREE.ShaderMaterial>(null);
	const uniforms = useMemo(() => ({ uReveal: { value: 0 }, uTime: { value: 0 } }), []);
	useFrame(({ clock }) => {
		if (!material.current) return;
		material.current.uniforms.uTime.value = clock.elapsedTime;
		material.current.uniforms.uReveal.value = THREE.MathUtils.smoothstep(clock.elapsedTime, 0.25, 0.9);
	});
	return (
		<mesh position={[0, -1.35, 0.35]}>
			<planeGeometry args={[9.5, 2.7]} />
			<shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} fragmentShader={horizonFragment} ref={material} transparent uniforms={uniforms} vertexShader={horizonVertex} />
		</mesh>
	);
}

function OrbitRings() {
	const group = useRef<THREE.Group>(null);
	const rings = useMemo(() => [
		{ center: [-0.18, 0.25, -1.7], radius: [1.88, 2.15], opacity: 0.075, delay: 0 },
		{ center: [0.34, 0.1, -2.15], radius: [2.34, 2.02], opacity: 0.048, delay: 0.18 },
		{ center: [-0.44, 0.34, -2.7], radius: [2.78, 2.35], opacity: 0.028, delay: 0.36 },
	].map((spec) => {
		const points = Array.from({ length: 192 }, (_, index) => {
			const angle = index / 192 * Math.PI * 2;
			return new THREE.Vector3(Math.cos(angle) * spec.radius[0], Math.sin(angle) * spec.radius[1], 0);
		});
		const line = new THREE.LineLoop(
			new THREE.BufferGeometry().setFromPoints(points),
			new THREE.LineBasicMaterial({ color: gold, opacity: 0, transparent: true }),
		);
		line.position.set(spec.center[0], spec.center[1], spec.center[2]);
		line.userData = spec;
		return line;
	}), []);
	useFrame(({ clock }) => {
		if (group.current) group.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.012;
		for (const ring of rings) {
			const reveal = THREE.MathUtils.smoothstep(clock.elapsedTime, 0.78 + ring.userData.delay, 1.55 + ring.userData.delay);
			(ring.material as THREE.LineBasicMaterial).opacity = ring.userData.opacity * reveal;
		}
	});
	return <group ref={group}>{rings.map((ring, index) => <primitive key={index} object={ring} />)}</group>;
}

type FabricLayerProps = {
	phase: number;
	position: [number, number, number];
	rotation: number;
	scale: number;
	opacity: number;
};

function FabricLayer({ phase, position, rotation, scale, opacity }: FabricLayerProps) {
	const material = useRef<THREE.ShaderMaterial>(null);
	const uniforms = useMemo(() => ({
		uTime: { value: 0 }, uReveal: { value: 0 }, uPhase: { value: phase },
		uOpacity: { value: opacity }, uGold: { value: gold },
	}), [opacity, phase]);
	useFrame(({ clock }) => {
		if (!material.current) return;
		material.current.uniforms.uTime.value = clock.elapsedTime;
		material.current.uniforms.uReveal.value = THREE.MathUtils.smoothstep(clock.elapsedTime, 2.05, 3.25);
	});
	return (
		<mesh position={position} rotation={[0.08, -0.1, rotation]} scale={scale}>
			<planeGeometry args={[7.4, 3.1, 160, 64]} />
			<shaderMaterial depthWrite={false} fragmentShader={fabricFragment} ref={material} side={THREE.DoubleSide} toneMapped={false} transparent uniforms={uniforms} vertexShader={fabricVertex} />
		</mesh>
	);
}

function FabricWaves() {
	return (
		<group>
			<FabricLayer opacity={0.82} phase={0.2} position={[3.42, -1.12, -0.75]} rotation={0.01} scale={1} />
			<FabricLayer opacity={0.56} phase={1.8} position={[3.18, -1.4, -1.28]} rotation={-0.035} scale={0.92} />
			<FabricLayer opacity={0.38} phase={3.1} position={[3.7, -1.65, -1.75]} rotation={0.05} scale={1.08} />
		</group>
	);
}

function GoldenParticles() {
	const points = useRef<THREE.Points>(null);
	const positions = useMemo(() => {
		const data = new Float32Array(96 * 3);
		for (let index = 0; index < 96; index += 1) {
			const seed = index + 1;
			data[index * 3] = Math.sin(seed * 47.13) * 4.8;
			data[index * 3 + 1] = -1.25 + (Math.sin(seed * 19.71) * 0.5 + 0.5) * 2.15;
			data[index * 3 + 2] = -2.6 + (Math.sin(seed * 8.37) * 0.5 + 0.5) * 2.1;
		}
		return data;
	}, []);
	useFrame(({ clock }) => {
		if (!points.current || !(points.current.material instanceof THREE.PointsMaterial)) return;
		points.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.012;
		points.current.material.opacity = 0.38 * THREE.MathUtils.smoothstep(clock.elapsedTime, 2.45, 3.25);
	});
	return (
		<points ref={points}>
			<bufferGeometry><bufferAttribute args={[positions, 3]} attach="attributes-position" /></bufferGeometry>
			<pointsMaterial blending={THREE.AdditiveBlending} color={paleGold} depthWrite={false} opacity={0} size={0.014} sizeAttenuation transparent />
		</points>
	);
}

export function CinematicHorizon() {
	const scene = useRef<THREE.Group>(null);
	const { camera, pointer } = useThree();
	useFrame(({ clock }, delta) => {
		const interaction = THREE.MathUtils.smoothstep(clock.elapsedTime, 2.9, 3.3);
		camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.19 * interaction, 2.8, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, pointer.y * 0.1 * interaction, 2.8, delta);
		camera.lookAt(0, -0.25, 0);
		if (scene.current) scene.current.rotation.y = THREE.MathUtils.damp(scene.current.rotation.y, pointer.x * 0.018 * interaction, 2.6, delta);
	});
	return (
		<group ref={scene}>
			<OrbitRings />
			<GoldenParticles />
			<FabricWaves />
			<HorizonLight />
		</group>
	);
}
