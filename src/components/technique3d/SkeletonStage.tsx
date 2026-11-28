'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';
import {
  FIGURE_BONES,
  REFERENCE_COLOR,
  SIDE_COLOR,
  VIEW_SAFE_FILL,
  clipFraming,
  framesAround,
  placeFrame,
  screenFit,
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

function CameraRig({ frames, live }: { frames: PoseFrame[]; live: PoseFrame[] }) {
  const { camera, gl, size } = useThree();
  const orbit = useRef<OrbitControls | null>(null);
  const target = useRef(new THREE.Vector3());
  const needed = useRef(3);
  const safe = useRef(3);
  const seen = useRef(false);
  const key = [...frames, ...live].map((frame) => `${frame[0]?.[0] ?? 0},${frame[16]?.[0] ?? 0},${frame[27]?.[1] ?? 0}`).join('|');

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const offset = camera.position.clone().sub(target.current);
    const haveOrbit = seen.current && offset.length() > 0.05;
    const direction: Vec3 = haveOrbit ? [offset.x, offset.y, offset.z] : [0, 0.12, 1];
    const fit = screenFit(frames, aspect, 40, direction);
    const guard = screenFit(live.length > 0 ? live : frames, aspect, 40, direction, VIEW_SAFE_FILL);
    needed.current = fit.distance;
    safe.current = guard.distance;
    target.current.set(fit.target[0], fit.target[1], fit.target[2]);
    const distance = haveOrbit ? Math.max(offset.length(), guard.distance) : Math.max(fit.distance, guard.distance);
    const dir = offset.length() > 0.05 ? offset.normalize() : new THREE.Vector3(direction[0], direction[1], direction[2]).normalize();
    camera.position.copy(target.current).addScaledVector(dir, distance);
    camera.lookAt(target.current);
    camera.updateProjectionMatrix();
    seen.current = true;
    const controls = orbit.current;
    if (!controls) return;
    controls.target.copy(target.current);
    controls.update();
  }, [camera, frames, key, live, size.width, size.height]);

  useFrame((_, delta) => {
    const offset = camera.position.clone().sub(target.current);
    const length = offset.length();
    if (length < 1e-4) return;
    const goal = Math.max(needed.current, safe.current);
    if (Math.abs(length - goal) < 0.004) return;
    const step = 1 - Math.exp(-Math.min(delta, 0.05) / 0.2);
    let next = length + (goal - length) * step;
    if (next < safe.current) next = safe.current;
    offset.multiplyScalar(next / length);
    camera.position.copy(target.current).add(offset);
    camera.lookAt(target.current);
    const controls = orbit.current;
    if (!controls) return;
    controls.target.copy(target.current);
    controls.update();
  });

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
  playerTimes,
  referenceTimes,
  time,
  layout,
}: {
  player: PoseFrame | null;
  reference: PoseFrame | null;
  playerClip: PoseFrame[] | null;
  referenceClip: PoseFrame[] | null;
  playerTimes: number[] | null;
  referenceTimes: number[] | null;
  time: number;
  layout: LayoutMode;
}) {
  const framing = useMemo(
    () => clipFraming(layout === 'reference' ? null : playerClip, layout === 'player' ? null : referenceClip, layout),
    [playerClip, referenceClip, layout],
  );
  const placedPlayer = useMemo(
    () => (player && layout !== 'reference' ? placeFrame(player, framing.playerShift, framing.playerDrop) : null),
    [player, layout, framing],
  );
  const placedReference = useMemo(
    () => (reference && layout !== 'player' ? placeFrame(reference, framing.referenceShift, framing.referenceDrop) : null),
    [reference, layout, framing],
  );
  const liveFrames = useMemo(() => {
    const out: PoseFrame[] = [];
    if (placedPlayer) out.push(placedPlayer);
    if (placedReference) out.push(placedReference);
    return out;
  }, [placedPlayer, placedReference]);
  const fitFrames = useMemo(() => {
    const out: PoseFrame[] = [];
    if (layout !== 'reference' && playerClip) {
      out.push(...framesAround(playerClip, playerTimes, time).map((frame) => placeFrame(frame, framing.playerShift, framing.playerDrop)!));
    }
    if (layout !== 'player' && referenceClip) {
      out.push(...framesAround(referenceClip, referenceTimes, time).map((frame) => placeFrame(frame, framing.referenceShift, framing.referenceDrop)!));
    }
    if (out.length === 0) {
      if (placedPlayer) out.push(placedPlayer);
      if (placedReference) out.push(placedReference);
    }
    return out;
  }, [layout, playerClip, referenceClip, playerTimes, referenceTimes, time, framing, placedPlayer, placedReference]);
  return (
    <div className="h-[60vh] min-h-[320px] w-full lg:h-[min(70vh,720px)]">
    <Canvas camera={{ fov: 40, near: 0.05, far: 80 }} style={{ width: '100%', height: '100%', background: '#07111f', borderRadius: 12 }}>
      <color attach="background" args={['#07111f']} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, 4, 3]} intensity={1.1} />
      <CameraRig frames={fitFrames} live={liveFrames} />
      <Ground bounds={framing.bounds} ground={framing.ground} />
      {placedPlayer && <Figure frame={placedPlayer} ghost={false} />}
      {placedReference && <Figure frame={placedReference} ghost={layout === 'overlay'} />}
    </Canvas>
    </div>
  );
}
