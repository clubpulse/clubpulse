'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import {
  FIGURE_BONES,
  REFERENCE_COLOR,
  SIDE_COLOR,
  clipFraming,
  frameCamera,
  placeFrame,
  type LayoutMode,
} from '@/lib/technique3d/figure';
import type { PoseFrame, Vec3 } from '@/lib/technique3d/types';

// three.js and @react-three/fiber are MIT. The skeleton is an estimate, not a body scan.

const JOINTS: Array<{ index: number; side: 'left' | 'right' | 'center'; radius: number }> = [
  { index: 0, side: 'center', radius: 0.1 },
  { index: 11, side: 'left', radius: 0.045 },
  { index: 12, side: 'right', radius: 0.045 },
  { index: 13, side: 'left', radius: 0.04 },
  { index: 14, side: 'right', radius: 0.04 },
  { index: 15, side: 'left', radius: 0.035 },
  { index: 16, side: 'right', radius: 0.035 },
  { index: 23, side: 'left', radius: 0.05 },
  { index: 24, side: 'right', radius: 0.05 },
  { index: 25, side: 'left', radius: 0.045 },
  { index: 26, side: 'right', radius: 0.045 },
  { index: 27, side: 'left', radius: 0.04 },
  { index: 28, side: 'right', radius: 0.04 },
];

function CameraRig({ bounds }: { bounds: { min: Vec3; max: Vec3 } }) {
  const { camera, gl, size } = useThree();
  const orbit = useRef<OrbitControls | null>(null);
  const target = useRef(new THREE.Vector3());
  const key = `${bounds.min.join(',')}:${bounds.max.join(',')}`;

  useLayoutEffect(() => {
    const [minText, maxText] = key.split(':');
    const read = (text: string): Vec3 => {
      const [x, y, z] = text.split(',').map(Number);
      return [x || 0, y || 0, z || 0];
    };
    const min = read(minText);
    const max = read(maxText);
    const aspect = size.width / Math.max(1, size.height);
    const fit = frameCamera({ min, max }, aspect);
    target.current.set(fit.target[0], fit.target[1], fit.target[2]);
    camera.position.set(fit.position[0], fit.position[1], fit.position[2]);
    camera.lookAt(target.current);
    camera.updateProjectionMatrix();
    const controls = orbit.current;
    if (!controls) return;
    controls.target.copy(target.current);
    controls.update();
  }, [camera, key, size.width, size.height]);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enablePan = false;
    controls.target.copy(target.current);
    controls.update();
    orbit.current = controls;
    return () => {
      controls.dispose();
      orbit.current = null;
    };
  }, [camera, gl]);

  return null;
}

function Limb({ a, b, color, radius, opacity }: { a: Vec3; b: Vec3; color: string; radius: number; opacity: number }) {
  const delta = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const length = delta.length();
  if (length < 0.02) return null;
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  const capsule = Math.max(0.001, length - radius * 2);
  return (
    <mesh position={mid} quaternion={quat} frustumCulled={false}>
      <capsuleGeometry args={[radius, capsule, 4, 10]} />
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.04} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function Figure({ frame, ghost }: { frame: PoseFrame; ghost: boolean }) {
  const palette = ghost ? REFERENCE_COLOR : SIDE_COLOR;
  const opacity = ghost ? 0.55 : 1;
  return (
    <group>
      {FIGURE_BONES.map((bone) => {
        const start = frame[bone.a];
        const end = frame[bone.b];
        if (!start || !end) return null;
        return (
          <Limb
            key={`${bone.a}-${bone.b}`}
            a={start}
            b={end}
            color={palette[bone.side]}
            radius={bone.side === 'center' ? 0.05 : 0.036}
            opacity={opacity}
          />
        );
      })}
      {JOINTS.map((joint) => {
        const point = frame[joint.index];
        if (!point) return null;
        return (
          <mesh key={joint.index} position={point} frustumCulled={false}>
            <sphereGeometry args={[joint.radius, 16, 12]} />
            <meshStandardMaterial color={palette[joint.side]} roughness={0.4} transparent={ghost} opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

function Ground({ bounds, ground }: { bounds: { min: Vec3; max: Vec3 }; ground: number }) {
  const size = Math.max(4, (bounds.max[0] - bounds.min[0]) * 2.4, (bounds.max[2] - bounds.min[2]) * 2.4);
  const center: [number, number, number] = [(bounds.min[0] + bounds.max[0]) / 2, ground, (bounds.min[2] + bounds.max[2]) / 2];
  return <gridHelper args={[size, 12, '#334155', '#1e293b']} position={center} />;
}

export function SkeletonStage({
  player,
  reference,
  playerClip,
  referenceClip,
  layout,
}: {
  player: PoseFrame | null;
  reference: PoseFrame | null;
  playerClip: PoseFrame[] | null;
  referenceClip: PoseFrame[] | null;
  layout: LayoutMode;
}) {
  const framing = useMemo(
    () => clipFraming(layout === 'reference' ? null : playerClip, layout === 'player' ? null : referenceClip, layout),
    [playerClip, referenceClip, layout],
  );
  const placedPlayer = player && layout !== 'reference' ? placeFrame(player, framing.playerShift, framing.playerDrop) : null;
  const placedReference = reference && layout !== 'player' ? placeFrame(reference, framing.referenceShift, framing.referenceDrop) : null;
  return (
    <Canvas camera={{ fov: 40, near: 0.05, far: 80 }} style={{ width: '100%', height: 'min(78vh, 760px)', minHeight: 480, background: '#07111f', borderRadius: 12 }}>
      <color attach="background" args={['#07111f']} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, 4, 3]} intensity={1.1} />
      <CameraRig bounds={framing.bounds} />
      <Ground bounds={framing.bounds} ground={framing.ground} />
      {placedPlayer && <Figure frame={placedPlayer} ghost={false} />}
      {placedReference && <Figure frame={placedReference} ghost={layout === 'overlay'} />}
    </Canvas>
  );
}
