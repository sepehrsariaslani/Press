import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor;
uniform float uBeamX;
uniform float uBeamY;
uniform float uHorizontalSize;
uniform float uVerticalSize;
uniform float uFogIntensity;
uniform float uFogScale;
uniform float uWispDensity;
uniform float uWispSpeed;
uniform float uWispIntensity;
uniform float uFlowSpeed;
uniform float uFlowStrength;
uniform float uDecay;
uniform float uFalloff;
uniform vec2 uMouse;
uniform float uTiltStrength;
out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.45);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;
  mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);
  for (int i = 0; i < 5; i++) {
    value += noise(p) * amplitude;
    p = turn * p * 2.04 + 13.7;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = vec2((uv.x - uBeamX) * (uResolution.x / uResolution.y), uv.y - (1.0 - uBeamY));
  p.y += uMouse.y * uTiltStrength * (p.x + 0.35);

  float horizontal = exp(-pow(abs(p.x) / max(uHorizontalSize, 0.001), uDecay) * 3.1);
  float vertical = exp(-pow(abs(p.y) / max(uVerticalSize, 0.001), 1.35) * 6.8);
  float beam = horizontal * vertical;
  float core = exp(-abs(p.y) * 430.0) * exp(-abs(p.x) * 3.8 / max(uFalloff, 0.1));

  vec2 fogUv = vec2(p.x * 3.2, p.y * 18.0) * uFogScale;
  fogUv += vec2(-uTime * uFlowSpeed * 0.08, uTime * uFlowSpeed * 0.035);
  float fog = fbm(fogUv + fbm(fogUv * 0.62 + 4.2));
  fog = smoothstep(0.28, 0.92, fog) * beam * uFogIntensity;

  float lanes = sin((p.x * 38.0 + fbm(vec2(p.x * 5.0, uTime * 0.035)) * 7.0) * uWispDensity);
  lanes = pow(max(lanes, 0.0), 14.0);
  float wisps = lanes * exp(-abs(p.y) * 92.0) * horizontal;
  wisps *= (0.55 + 0.45 * noise(vec2(p.x * 18.0 - uTime * uWispSpeed * 0.02, 3.4))) * uWispIntensity * 0.12;

  float pulse = 1.0 + sin(uTime * uFlowSpeed) * uFlowStrength;
  float strength = (beam * 0.11 + fog + wisps + core * 0.95) * pulse;
  vec3 color = mix(uColor * 0.42, vec3(1.0, 0.965, 0.86), clamp(core * 1.6, 0.0, 1.0));
  float alpha = clamp(strength, 0.0, 0.92);
  fragColor = vec4(color * alpha, alpha);
}`;

export type LaserFlowProps = {
	wispDensity?: number;
	dpr?: number;
	mouseTiltStrength?: number;
	horizontalBeamOffset?: number;
	verticalBeamOffset?: number;
	flowSpeed?: number;
	verticalSizing?: number;
	horizontalSizing?: number;
	fogIntensity?: number;
	fogScale?: number;
	wispSpeed?: number;
	wispIntensity?: number;
	flowStrength?: number;
	decay?: number;
	falloffStart?: number;
	color?: string;
	disableAnimation?: boolean;
	className?: string;
	style?: CSSProperties;
};

export function LaserFlow({
	wispDensity = 0.3,
	dpr = 1.35,
	mouseTiltStrength = 0.003,
	horizontalBeamOffset = 0.5,
	verticalBeamOffset = 0.78,
	flowSpeed = 0.14,
	verticalSizing = 0.075,
	horizontalSizing = 0.64,
	fogIntensity = 0.45,
	fogScale = 0.2,
	wispSpeed = 5,
	wispIntensity = 1.3,
	flowStrength = 0.06,
	decay = 1.4,
	falloffStart = 1.05,
	color = '#c8a66a',
	disableAnimation = false,
	className = '',
	style,
}: LaserFlowProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const pointerRef = useRef({ targetX: 0, targetY: 0, x: 0, y: 0 });

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !('WebGL2RenderingContext' in window)) return;
		const renderer = new Renderer({ alpha: true, antialias: false, dpr: Math.min(dpr, 1.5), premultipliedAlpha: true });
		const gl = renderer.gl;
		gl.clearColor(0, 0, 0, 0);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		const tint = new Color(color);
		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 }, uResolution: { value: [1, 1] }, uColor: { value: [tint.r, tint.g, tint.b] },
				uBeamX: { value: horizontalBeamOffset }, uBeamY: { value: verticalBeamOffset },
				uHorizontalSize: { value: horizontalSizing }, uVerticalSize: { value: verticalSizing },
				uFogIntensity: { value: fogIntensity }, uFogScale: { value: fogScale },
				uWispDensity: { value: wispDensity }, uWispSpeed: { value: wispSpeed }, uWispIntensity: { value: wispIntensity },
				uFlowSpeed: { value: flowSpeed }, uFlowStrength: { value: flowStrength }, uDecay: { value: decay },
				uFalloff: { value: falloffStart }, uMouse: { value: [0, 0] }, uTiltStrength: { value: mouseTiltStrength },
			},
		});
		const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
		container.appendChild(gl.canvas);
		const resize = () => {
			renderer.setSize(Math.max(container.offsetWidth, 1), Math.max(container.offsetHeight, 1));
			program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
		};
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(container);
		resize();

		let visible = true;
		const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
		visibilityObserver.observe(container);
		const onPointerMove = (event: PointerEvent) => {
			const bounds = container.getBoundingClientRect();
			pointerRef.current.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
			pointerRef.current.targetY = (0.5 - (event.clientY - bounds.top) / bounds.height) * 2;
		};
		window.addEventListener('pointermove', onPointerMove, { passive: true });

		let frame = 0;
		const render = (time: number) => {
			frame = requestAnimationFrame(render);
			if (!visible || document.hidden) return;
			const pointer = pointerRef.current;
			pointer.x += (pointer.targetX - pointer.x) * 0.035;
			pointer.y += (pointer.targetY - pointer.y) * 0.035;
			program.uniforms.uMouse.value = [pointer.x, pointer.y];
			if (!disableAnimation) program.uniforms.uTime.value = time * 0.001;
			renderer.render({ scene: mesh });
		};
		frame = requestAnimationFrame(render);

		return () => {
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			visibilityObserver.disconnect();
			window.removeEventListener('pointermove', onPointerMove);
			if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	}, [color, decay, disableAnimation, dpr, falloffStart, flowSpeed, flowStrength, fogIntensity, fogScale, horizontalBeamOffset, horizontalSizing, mouseTiltStrength, verticalBeamOffset, verticalSizing, wispDensity, wispIntensity, wispSpeed]);

	return <div aria-hidden="true" className={`laser-flow ${className}`.trim()} ref={containerRef} style={style} />;
}
