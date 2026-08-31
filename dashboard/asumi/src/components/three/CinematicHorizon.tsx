import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LENS_FLARE_GHOSTS } from '../../scene/lensFlare';


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

const ghostFragment = `
precision highp float;
varying vec2 vUv;
uniform float uReveal;
uniform float uOpacity;
uniform float uPhase;
uniform float uWarmth;
uniform float uTime;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float shell = exp(-abs(radius - 0.82) * 42.0);
  float outerHaze = exp(-radius * radius * 2.15) * 0.075;
  float innerRing = exp(-abs(radius - 0.48) * 18.0) * 0.12;
  float caustic = innerRing * (0.34 + 0.66 * pow(0.5 + 0.5 * cos(angle * 2.0 + uPhase + uTime * 0.04), 3.0));
  float aperture = smoothstep(1.0, 0.91, radius);
  vec3 neutral = vec3(0.62, 0.65, 0.62);
  vec3 amber = vec3(0.88, 0.61, 0.29);
  vec3 color = mix(neutral, amber, uWarmth);
	float strength = (shell * 0.78 + outerHaze * 1.25 + caustic * 1.18) * aperture * uOpacity * uReveal;
  gl_FragColor = vec4(color * strength, strength);
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
		material.current.uniforms.uReveal.value = THREE.MathUtils.smoothstep(clock.elapsedTime, 0.25, 0.9);
	});
	return (
		<mesh position={[0, -1.35, 0.35]}>
			<planeGeometry args={[9.5, 2.7]} />
			<shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} fragmentShader={horizonFragment} ref={material} transparent uniforms={uniforms} vertexShader={horizonVertex} />
		</mesh>
	);
}

function LensFlare() {
	const group = useRef<THREE.Group>(null);
	const ghostMaterials = useRef<Array<THREE.ShaderMaterial | null>>([]);
	const starMaterial = useRef<THREE.ShaderMaterial>(null);
	const ghostUniforms = useMemo(() => LENS_FLARE_GHOSTS.map((ghost) => ({
		uReveal: { value: 0 }, uOpacity: { value: ghost.opacity }, uPhase: { value: ghost.phase },
		uWarmth: { value: ghost.warmth }, uTime: { value: 0 },
	})), []);
	const starUniforms = useMemo(() => ({ uReveal: { value: 0 }, uTime: { value: 0 } }), []);

	useFrame(({ clock, pointer }, delta) => {
		const reveal = THREE.MathUtils.smoothstep(clock.elapsedTime, 0.68, 1.5);
		ghostMaterials.current.forEach((material) => {
			if (!material) return;
			material.uniforms.uReveal.value = reveal;
			material.uniforms.uTime.value = clock.elapsedTime;
		});
		if (starMaterial.current) {
			starMaterial.current.uniforms.uReveal.value = THREE.MathUtils.smoothstep(clock.elapsedTime, 0.28, 0.82);
			starMaterial.current.uniforms.uTime.value = clock.elapsedTime;
		}
		if (group.current) {
			group.current.position.x = THREE.MathUtils.damp(group.current.position.x, pointer.x * -0.035, 2.4, delta);
			group.current.position.y = THREE.MathUtils.damp(group.current.position.y, pointer.y * -0.02, 2.4, delta);
		}
	});

	return (
		<group ref={group}>
			{LENS_FLARE_GHOSTS.map((ghost, index) => (
				<mesh key={index} position={ghost.position} scale={ghost.size}>
					<planeGeometry args={[1, 1]} />
					<shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} fragmentShader={ghostFragment} ref={(material) => { ghostMaterials.current[index] = material; }} toneMapped={false} transparent uniforms={ghostUniforms[index]} vertexShader={horizonVertex} />
				</mesh>
			))}
			<mesh position={[0, -1.13, 0.5]} scale={1.45}>
				<planeGeometry args={[1.8, 1.8]} />
				<shaderMaterial blending={THREE.AdditiveBlending} depthWrite={false} fragmentShader={starFragment} ref={starMaterial} toneMapped={false} transparent uniforms={starUniforms} vertexShader={horizonVertex} />
			</mesh>
		</group>
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
			<LensFlare />
			<HorizonLight />
		</group>
	);
}
