import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';


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
  float strength = core * 2.2 + line * 0.34 + haze * 0.58 + reflection * 0.22;
  vec3 color = mix(vec3(0.42, 0.26, 0.11), vec3(1.0, 0.91, 0.72), clamp(core + line, 0.0, 1.0));
  gl_FragColor = vec4(color * strength * uReveal, clamp(strength * uReveal, 0.0, 1.0));
}`;

const starFragment = `
precision highp float;
varying vec2 vUv;
uniform float uReveal;
uniform float uTime;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float c = 0.70710678;
  vec2 diagonal = vec2(p.x * c - p.y * c, p.x * c + p.y * c);
  float core = exp(-length(p) * 34.0);
  float rayA = exp(-abs(diagonal.y) * 115.0) * exp(-abs(diagonal.x) * 4.2);
  float rayB = exp(-abs(diagonal.x) * 150.0) * exp(-abs(diagonal.y) * 6.0) * 0.56;
  float needle = exp(-abs(p.y) * 190.0) * exp(-abs(p.x) * 7.0) * 0.42;
  float pulse = 0.94 + sin(uTime * 0.7) * 0.06;
  float strength = (core * 1.8 + rayA * 0.48 + rayB * 0.3 + needle * 0.22) * uReveal * pulse;
  vec3 color = mix(vec3(1.0, 0.83, 0.52), vec3(1.0, 0.98, 0.9), core);
  gl_FragColor = vec4(color * strength, clamp(strength, 0.0, 1.0));
}`;

function HorizonLight() {
	const material = useRef<THREE.ShaderMaterial>(null);
	const uniforms = useMemo(() => ({ uReveal: { value: 0 }, uTime: { value: 0 } }), []);
	useFrame(({ clock }) => {
		if (!material.current) return;
		material.current.uniforms.uTime.value = clock.elapsedTime;
		const reveal = THREE.MathUtils.smoothstep(clock.elapsedTime, 0.25, 2.2);
		const breath = 1 + Math.sin(clock.elapsedTime * 0.9) * 0.035 * reveal;
		material.current.uniforms.uReveal.value = reveal * breath;
	});
	return (
		<mesh position={[0, -1.35, 0.35]}>
			<planeGeometry args={[9.5, 2.7]} />
			<shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} fragmentShader={horizonFragment} ref={material} transparent uniforms={uniforms} vertexShader={horizonVertex} />
		</mesh>
	);
}

function SunriseCore() {
	const starMaterial = useRef<THREE.ShaderMaterial>(null);
	const starUniforms = useMemo(() => ({ uReveal: { value: 0 }, uTime: { value: 0 } }), []);

	useFrame(({ clock }) => {
		if (starMaterial.current) {
			starMaterial.current.uniforms.uReveal.value = THREE.MathUtils.smoothstep(clock.elapsedTime, 0.28, 2.05);
			starMaterial.current.uniforms.uTime.value = clock.elapsedTime;
		}
	});

	return (
		<mesh position={[0, -1.13, 0.5]} scale={1.45}>
			<planeGeometry args={[1.8, 1.8]} />
			<shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} fragmentShader={starFragment} ref={starMaterial} toneMapped={false} transparent uniforms={starUniforms} vertexShader={horizonVertex} />
		</mesh>
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
			<HorizonLight />
			<SunriseCore />
		</group>
	);
}
