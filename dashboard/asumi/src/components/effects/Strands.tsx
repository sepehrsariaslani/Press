import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

const MAX_STRANDS = 8;
const MAX_COLORS = 6;

const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;
out vec4 fragColor;

vec3 palette(float t) {
  float scaled = fract(t) * float(uColorCount);
  int index = int(floor(scaled));
  int nextIndex = index + 1;
  if (nextIndex >= uColorCount) nextIndex = 0;
  return mix(uColors[index], uColors[nextIndex], fract(scaled));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);
  uv.x += 0.34;
  float progress = clamp((uv.x + 0.25) / 1.15, 0.0, 1.0);
  float origin = smoothstep(0.0, 0.14, progress);
  float exitFade = 1.0 - smoothstep(0.82, 1.15, progress);
  float envelope = origin * exitFade;
  float energy = 0.08 + uIntensity * 0.76;
  vec3 color = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;
    float fi = float(i);
    float phase = fi * 1.47 * uSpread;
    float speedScale = mix(0.64, 1.16, fract(fi * 0.71));
    float time = uTime * uSpeed * speedScale;
    float low = sin(uv.x * (1.2 + fi * 0.15) * uWaviness - time * 0.34 + phase);
    float fold = sin(uv.x * (2.8 + fi * 0.21) * uWaviness + time * 0.21 + phase * 1.7);
    float detail = sin(uv.x * 5.6 - time * 0.13 + phase * 2.2);
    float fan = smoothstep(0.02, 0.82, progress);
    float rise = -0.2 + pow(progress, 2.35) * (0.52 + fi * 0.022);
    float spreadOffset = (fi - float(uStrandCount - 1) * 0.5) * 0.105 * uSpread * pow(progress, 1.3);
    float organicBend = (low * 0.075 + fold * 0.038 + detail * 0.014) * uAmplitude * (0.08 + fan * 0.92);
    float y = rise + spreadOffset + organicBend;
    float distanceToStrand = abs(uv.y - y);
    float bodyWidth = (0.024 + fi * 0.004) * mix(0.2, 1.18, fan) * uThickness;
    float softness = bodyWidth * 0.5;
    float body = 1.0 - smoothstep(bodyWidth - softness, bodyWidth + softness, distanceToStrand);
    float signedDistance = uv.y - y;
    float rimWidth = max(bodyWidth * 0.12, 0.0009);
    float upperRim = exp(-abs(signedDistance - bodyWidth * 0.72) / rimWidth);
    float lowerRim = exp(-abs(signedDistance + bodyWidth * 0.68) / (rimWidth * 1.8)) * 0.16;
    float innerFold = pow(0.5 + 0.5 * sin((signedDistance / bodyWidth) * 2.3 + phase + time * 0.06), 7.0) * body;
    vec3 strand = palette(fi / float(uStrandCount) + progress * 0.12);
    vec3 champagne = mix(vec3(0.032, 0.029, 0.024), strand * 0.24, 0.48 + innerFold * 0.52);
    color += (champagne * body + strand * upperRim * 0.38 + strand * lowerRim + strand * innerFold * 0.08) * envelope;
  }

  color = 1.0 - exp(-color * uGlow * (0.22 + energy * 0.38));
  float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = max(mix(vec3(gray), color, uSaturation), 0.0);
  float alpha = clamp(max(max(color.r, color.g), color.b), 0.0, 1.0) * uOpacity;
  fragColor = vec4(color * uOpacity, alpha);
}
`;

export type StrandsProps = {
	colors?: string[];
	count?: number;
	speed?: number;
	amplitude?: number;
	waviness?: number;
	thickness?: number;
	glow?: number;
	taper?: number;
	spread?: number;
	intensity?: number;
	saturation?: number;
	opacity?: number;
	scale?: number;
	disableAnimation?: boolean;
	className?: string;
	style?: CSSProperties;
};

function buildPalette(colors: string[]) {
	const source = colors.length ? colors : ['#ffffff'];
	return Array.from({ length: MAX_COLORS }, (_, index) => {
		const color = new Color(source[index] ?? source[source.length - 1]);
		return [color.r, color.g, color.b];
	});
}

export function Strands({
	colors = ['#f5e7cc', '#c8a66a', '#4b4338'],
	count = 4,
	speed = 0.22,
	amplitude = 0.62,
	waviness = 0.72,
	thickness = 0.34,
	glow = 3.1,
	taper = 5,
	spread = 0.65,
	intensity = 0.48,
	saturation = 0.52,
	opacity = 0.9,
	scale = 1.25,
	disableAnimation = false,
	className = '',
	style,
}: StrandsProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const valuesRef = useRef({ colors, count, speed, amplitude, waviness, thickness, glow, taper, spread, intensity, saturation, opacity, scale, disableAnimation });
	valuesRef.current = { colors, count, speed, amplitude, waviness, thickness, glow, taper, spread, intensity, saturation, opacity, scale, disableAnimation };

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !('WebGL2RenderingContext' in window)) return;

		const renderer = new Renderer({ alpha: true, antialias: true, premultipliedAlpha: true });
		const gl = renderer.gl;
		gl.clearColor(0, 0, 0, 0);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		const geometry = new Triangle(gl);
		if (geometry.attributes.uv) delete geometry.attributes.uv;
		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 },
				uResolution: { value: [container.offsetWidth, container.offsetHeight] },
				uColors: { value: buildPalette(colors) },
				uColorCount: { value: Math.min(colors.length, MAX_COLORS) },
				uStrandCount: { value: Math.min(count, MAX_STRANDS) },
				uSpeed: { value: speed }, uAmplitude: { value: amplitude }, uWaviness: { value: waviness },
				uThickness: { value: thickness }, uGlow: { value: glow }, uTaper: { value: taper },
				uSpread: { value: spread }, uIntensity: { value: intensity }, uOpacity: { value: opacity },
				uScale: { value: scale }, uSaturation: { value: saturation },
			},
		});
		const mesh = new Mesh(gl, { geometry, program });
		container.appendChild(gl.canvas);

		const resize = () => {
			const width = container.offsetWidth;
			const height = container.offsetHeight;
			renderer.setSize(width, height);
			program.uniforms.uResolution.value = [width, height];
		};
		const observer = new ResizeObserver(resize);
		observer.observe(container);
		resize();

		let frame = 0;
		const render = (time: number) => {
			frame = requestAnimationFrame(render);
			if (document.hidden) return;
			const current = valuesRef.current;
			if (!current.disableAnimation) program.uniforms.uTime.value = time * 0.001;
			program.uniforms.uColors.value = buildPalette(current.colors);
			program.uniforms.uColorCount.value = Math.min(current.colors.length, MAX_COLORS);
			program.uniforms.uStrandCount.value = Math.min(Math.max(Math.round(current.count), 1), MAX_STRANDS);
			for (const key of ['speed', 'amplitude', 'waviness', 'thickness', 'glow', 'taper', 'spread', 'intensity', 'opacity', 'scale', 'saturation'] as const) {
				program.uniforms[`u${key[0].toUpperCase()}${key.slice(1)}`].value = current[key];
			}
			renderer.render({ scene: mesh });
		};
		frame = requestAnimationFrame(render);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	}, []);

	return <div aria-hidden="true" className={`strands ${className}`.trim()} ref={containerRef} style={style} />;
}
