import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Vector3, type Group, type MeshBasicMaterial, type Mesh } from 'three';
import { transition } from '../chapters';
import { dashboardPositions, documentCount, documentPose } from './documentMotion';
import { makeDocumentTexture } from './documentTextures';

function DocumentCard({ index, progress }: { index: number; progress: RefObject<number> }) {
  const group = useRef<Group>(null);
  const invoice = useRef<MeshBasicMaterial>(null);
  const dashboard = useRef<MeshBasicMaterial>(null);
  const textures = useMemo(() => [makeDocumentTexture(index, false), makeDocumentTexture(index, true)], [index]);
  useEffect(() => () => textures.forEach(texture => texture.dispose()), [textures]);
  useFrame(() => {
    if (!group.current) return;
    const pose = documentPose(index, progress.current);
    group.current.position.set(pose.position[0], pose.position[1], pose.position[2]);
    group.current.rotation.set(pose.rotation[0], pose.rotation[1], pose.rotation[2]);
    group.current.scale.setScalar(pose.scale);
    if (invoice.current) invoice.current.opacity = (1 - pose.dashboard) * pose.opacity;
    if (dashboard.current) dashboard.current.opacity = pose.dashboard;
  });
  return <group ref={group}>
    <mesh castShadow receiveShadow><boxGeometry args={[1.02, .85, .018]} /><meshStandardMaterial color="#ebe8dc" roughness={.92} /></mesh>
    <mesh position-z={.010}><planeGeometry args={[1, .833]} /><meshBasicMaterial ref={invoice} map={textures[0]} transparent depthWrite={false} toneMapped={false} /></mesh>
    <mesh position-z={.012}><planeGeometry args={[1, .833]} /><meshBasicMaterial ref={dashboard} map={textures[1]} transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>
  </group>;
}

function FlowLine({ index, progress }: { index: number; progress: RefObject<number> }) {
  const material = useRef<MeshBasicMaterial>(null);
  const dot = useRef<Mesh>(null);
  const curve = useMemo(() => {
    const a = new Vector3(...dashboardPositions[index] as [number, number, number]);
    const b = new Vector3(...dashboardPositions[(index + 1) % 3] as [number, number, number]);
    return new CatmullRomCurve3([a, new Vector3(Math.max(a.x, b.x) + .45, (a.y + b.y) / 2, -.16), b]);
  }, [index]);
  const point = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const p = progress.current;
    const opacity = transition(.64, .72, p) * (1 - transition(.87, .97, p));
    if (material.current) material.current.opacity = opacity * .6;
    if (dot.current) {
      dot.current.visible = opacity > .01;
      curve.getPointAt(((Math.max(0, p - .64) * 12 + index / 3) % 1), point);
      dot.current.position.copy(point);
    }
  });
  return <group>
    <mesh><tubeGeometry args={[curve, 36, .005, 5, false]} /><meshBasicMaterial ref={material} color="#be914b" transparent opacity={0} depthWrite={false} /></mesh>
    <mesh ref={dot}><sphereGeometry args={[.025, 12, 8]} /><meshBasicMaterial color="#e8bb66" /></mesh>
  </group>;
}

export function DocumentFlow({ progress }: { progress: RefObject<number> }) {
  return <group>{Array.from({ length: documentCount }, (_, index) => <DocumentCard key={index} index={index} progress={progress} />)}
    {[0, 1, 2].map(index => <FlowLine key={index} index={index} progress={progress} />)}
  </group>;
}
