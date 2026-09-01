import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';

const MAX_STRANDS = 6;
const MAX_COLORS = 4;

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
  float energy = 0.06 + uIntensity * 0.94;
  float envelope = pow(max(cos(uv.x * 3.14159265 * 1.3), 0.0), uTaper);
  vec3 color = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;
    float fi = float(i);
    float phase = fi * 1.7 * uSpread;
    float frequency = (2.0 + fi * 0.35) * uWaviness;
    float strandTime = uTime * uSpeed;
    float wave = sin(uv.x * frequency + strandTime * (1.4 + fi * 1.2) + phase) * 0.60
      + sin(uv.x * frequency * 1.1 - strandTime * (1.0 + fi * 0.5) + phase * 1.7) * 0.40;
    float y = wave * (0.1 + 0.02 * energy) * envelope * uAmplitude;
    float distanceToStrand = abs(uv.y - y);
    float width = (0.001 + 0.05 * energy) * (0.35 + envelope) * uThickness;
    float glow = width / (distanceToStrand + width * 0.45);
    glow *= glow;
    color += palette(fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04) * glow * envelope;
  }

  color *= 0.45 + 0.7 * energy;
  color = 1.0 - exp(-color * uGlow);
  float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = max(mix(vec3(gray), color, uSaturation), 0.0);
  float alpha = clamp(max(max(color.r, color.g), color.b), 0.0, 1.0) * uOpacity;
  fragColor = vec4(color * uOpacity, alpha);
}
`;

const colors = ['#fff0e6', '#ed873a', '#f3e8c7'];

function palette() {
	return Array.from({ length: MAX_COLORS }, (_, index) => {
		const color = new Color(colors[index] ?? colors[colors.length - 1]);
		return [color.r, color.g, color.b];
	});
}

export function LoaderStrands() {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !('WebGL2RenderingContext' in window)) return;

		const renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 1.25), premultipliedAlpha: true });
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
				uTime: { value: 0 }, uResolution: { value: [1, 1] }, uColors: { value: palette() },
				uColorCount: { value: colors.length }, uStrandCount: { value: 3 }, uSpeed: { value: 0.6 },
				uAmplitude: { value: 1.4 }, uWaviness: { value: 2.4 }, uThickness: { value: 0.7 },
				uGlow: { value: 2.6 }, uTaper: { value: 2.1 }, uSpread: { value: 1 },
				uIntensity: { value: 0.55 }, uOpacity: { value: 1 }, uScale: { value: 1.5 }, uSaturation: { value: 1.5 },
			},
		});
		const mesh = new Mesh(gl, { geometry, program });
		container.appendChild(gl.canvas);

		const resize = () => {
			const width = Math.max(container.offsetWidth, 1);
			const height = Math.max(container.offsetHeight, 1);
			renderer.setSize(width, height);
			program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
		};
		const observer = new ResizeObserver(resize);
		observer.observe(container);
		resize();

		let frame = 0;
		const render = (time: number) => {
			frame = requestAnimationFrame(render);
			if (document.hidden) return;
			program.uniforms.uTime.value = time * 0.001;
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

	return <div aria-hidden="true" className="loader-strands" data-testid="loader-strands" ref={containerRef} />;
}
