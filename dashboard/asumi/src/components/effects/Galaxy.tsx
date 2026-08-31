import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

const DEFAULT_FOCAL: [number, number] = [0.5, 0.5];
const DEFAULT_ROTATION: [number, number] = [1, 0];

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentShader = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform bool uTransparent;
varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) { return abs(fract(x) * 2.0 - 1.0); }
float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}
float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
  return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
}

float star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  return m * smoothstep(1.0, 0.2, d);
}

vec3 starLayer(vec2 uv) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = hash21(si);
      float size = fract(seed * 345.32);
      float gloss = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * gloss;
      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blue = smoothstep(STAR_COLOR_CUTOFF, 1.0, hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float green = min(red, blue) * seed;
      vec3 base = vec3(red, green, blue);
      float hue = atan(base.g - base.r, base.b - base.r) / 6.28318 + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));
      vec2 drift = vec2(
        tris(seed * 34.0 + uTime * uSpeed / 10.0),
        tris(seed * 38.0 + uTime * uSpeed / 30.0)
      ) - 0.5;
      float light = star(gv - offset - drift, flareSize);
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      light *= mix(1.0, twinkle, uTwinkleIntensity);
      col += light * size * base;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
  float angle = uTime * uRotationSpeed;
  uv = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;
  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += starLayer(uv * scale + i * 453.32) * fade;
  }
  if (uTransparent) {
    float alpha = min(smoothstep(0.0, 0.3, length(col)), 1.0);
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}`;

export type GalaxyProps = {
	focal?: [number, number];
	rotation?: [number, number];
	starSpeed?: number;
	density?: number;
	hueShift?: number;
	disableAnimation?: boolean;
	speed?: number;
	glowIntensity?: number;
	saturation?: number;
	twinkleIntensity?: number;
	rotationSpeed?: number;
	transparent?: boolean;
	className?: string;
	style?: CSSProperties;
};

export function Galaxy({
	focal = DEFAULT_FOCAL,
	rotation = DEFAULT_ROTATION,
	starSpeed = 0.14,
	density = 0.92,
	hueShift = 42,
	disableAnimation = false,
	speed = 0.08,
	glowIntensity = 0.16,
	saturation = 0.3,
	twinkleIntensity = 0.12,
	rotationSpeed = 0.008,
	transparent = true,
	className = '',
	style,
}: GalaxyProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !('WebGLRenderingContext' in window)) return;

		const renderer = new Renderer({ alpha: transparent, premultipliedAlpha: false });
		const gl = renderer.gl;
		if (transparent) {
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.clearColor(0, 0, 0, 0);
		} else {
			gl.clearColor(0, 0, 0, 1);
		}

		const geometry = new Triangle(gl);
		const program = new Program(gl, {
			vertex: vertexShader,
			fragment: fragmentShader,
			uniforms: {
				uTime: { value: 0 },
				uResolution: { value: new Color(1, 1, 1) },
				uFocal: { value: new Float32Array(focal) },
				uRotation: { value: new Float32Array(rotation) },
				uStarSpeed: { value: starSpeed },
				uDensity: { value: density },
				uHueShift: { value: hueShift },
				uSpeed: { value: speed },
				uGlowIntensity: { value: glowIntensity },
				uSaturation: { value: saturation },
				uTwinkleIntensity: { value: twinkleIntensity },
				uRotationSpeed: { value: rotationSpeed },
				uTransparent: { value: transparent },
			},
		});
		const mesh = new Mesh(gl, { geometry, program });
		container.appendChild(gl.canvas);

		const resize = () => {
			const width = Math.max(container.offsetWidth, 1);
			const height = Math.max(container.offsetHeight, 1);
			renderer.setSize(width, height);
			program.uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(container);
		resize();

		let frame = 0;
		const render = (time: number) => {
			frame = requestAnimationFrame(render);
			if (document.hidden) return;
			if (!disableAnimation) {
				program.uniforms.uTime.value = time * 0.001;
				program.uniforms.uStarSpeed.value = (time * 0.001 * starSpeed) / 10;
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
	}, [density, disableAnimation, focal, glowIntensity, hueShift, rotation, rotationSpeed, saturation, speed, starSpeed, transparent, twinkleIntensity]);

	return <div aria-hidden="true" className={`galaxy ${className}`.trim()} ref={containerRef} style={style} />;
}
