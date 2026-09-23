import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { AnimationMixer, LoopOnce, Mesh, OrthographicCamera, PMREMGenerator, Color, PCFShadowMap } from 'three';
import type { DirectionalLight, HemisphereLight } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { transition, lerp } from '../chapters';
import type { MotionRef } from '../useStoryProgress';
import { DocumentFlow } from './DocumentFlow';

const modelUrl = new URL('../assets/asumi-office.glb', import.meta.url).href;

function OfficeScene({ motion, onReady }: { motion: MotionRef; onReady: () => void }) {
  const { scene, gl, camera, size, invalidate } = useThree();
  const asset = useLoader(GLTFLoader, modelUrl);
  const progress = useRef(motion.current.progress);
  const sun = useRef<DirectionalLight>(null);
  const ambient = useRef<HemisphereLight>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const mixer = useMemo(() => new AnimationMixer(asset.scene), [asset.scene]);
  const duration = Math.max(0, ...asset.animations.map(clip => clip.duration));

  useEffect(() => {
    asset.scene.traverse(object => {
      if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    asset.animations.forEach(clip => {
      const action = mixer.clipAction(clip);
      action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play();
    });
    onReady(); invalidate();
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(asset.scene); };
  }, [asset, mixer, onReady, invalidate]);
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => { if (alive) { setFontsReady(true); invalidate(); } });
    return () => { alive = false; };
  }, [invalidate]);
  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const texture = generator.fromScene(room, .025);
    scene.environment = texture.texture;
    room.dispose(); generator.dispose(); invalidate();
    return () => { scene.environment = null; texture.dispose(); };
  }, [gl, scene, invalidate]);
  useEffect(() => {
    motion.current.invalidate = invalidate;
    invalidate();
    return () => { motion.current.invalidate = undefined; };
  }, [motion, invalidate]);
  useEffect(() => {
    if (camera instanceof OrthographicCamera) {
      camera.zoom = Math.min(size.width / 4.15, size.height / 3.2);
      camera.lookAt(.07, 1.30, 0);
      camera.updateProjectionMatrix(); invalidate();
    }
  }, [camera, size, invalidate]);
  useFrame((_, delta) => {
    const target = motion.current.progress;
    const difference = target - progress.current;
    if (motion.current.reducedMotion || Math.abs(difference) < .00008) progress.current = target;
    else { progress.current += difference * (1 - Math.exp(-7 * Math.min(delta, .1))); invalidate(); }
    const p = progress.current;
    const light = transition(.02, .9, p);
    mixer.setTime(Math.min(duration - .001, Math.max(0, p * duration)));
    if (sun.current) sun.current.intensity = lerp(.9, 3.1, light);
    if (ambient.current) ambient.current.intensity = lerp(.30, 1.05, light);
    scene.environmentIntensity = lerp(.22, .65, light);
    gl.toneMappingExposure = lerp(.68, 1.05, light);
  }, -1);
  return <>
    <hemisphereLight ref={ambient} args={['#fff3d9', '#6f8271', .3]} />
    <directionalLight ref={sun} position={[-3, 5, 4]} color="#fff0d2" intensity={.9} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={4} shadow-camera-bottom={-2} shadow-bias={-.0005} shadow-normalBias={.025} shadow-radius={4} />
    <directionalLight position={[3, 2, -3]} color="#ffe8b6" intensity={1.5} />
    <primitive object={asset.scene} />
    {fontsReady && <DocumentFlow progress={progress} />}
    <mesh rotation-x={-Math.PI / 2} position-y={.005} receiveShadow><planeGeometry args={[200, 200]} /><shadowMaterial transparent opacity={.12} depthWrite={false} /></mesh>
  </>;
}

export default function OfficeCanvas({ motion, poster }: { motion: MotionRef; poster: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const onReady = useMemo(() => () => setReady(true), []);
  return <>
    {(!ready || lost) && poster}
    {!lost && <div className="office-canvas" data-ready={ready} aria-hidden="true">
      <Canvas orthographic frameloop="demand" shadows={{ type: PCFShadowMap }} dpr={[1, 1.5]} camera={{ position: [3, 2.8, 6], zoom: 150, near: .1, far: 200 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} fallback={poster}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new Color('#000000'), 0);
          scene.background = null;
          gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setLost(true); }, { once: true });
        }}>
        <Suspense fallback={null}><OfficeScene motion={motion} onReady={onReady} /></Suspense>
      </Canvas>
    </div>}
  </>;
}
