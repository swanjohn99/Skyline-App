import { useMemo, useState, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

const INNER_RADIUS = 1.05;
const OUTER_RADIUS = 2.1;
const DEPTH = 0.55;
const GAP = 0.012;

function createSliceGeometry(startAngle, endAngle) {
  const shape = new THREE.Shape();
  const mid = (startAngle + endAngle) / 2;
  const gap = GAP / OUTER_RADIUS;

  const outerStart = startAngle + gap;
  const outerEnd = endAngle - gap;
  const innerStart = startAngle + gap * (INNER_RADIUS / OUTER_RADIUS);
  const innerEnd = endAngle - gap * (INNER_RADIUS / OUTER_RADIUS);

  if (outerEnd <= outerStart) {
    return null;
  }

  shape.moveTo(
    OUTER_RADIUS * Math.cos(outerStart),
    OUTER_RADIUS * Math.sin(outerStart),
  );
  shape.absarc(0, 0, OUTER_RADIUS, outerStart, outerEnd, false);
  shape.lineTo(
    INNER_RADIUS * Math.cos(innerEnd),
    INNER_RADIUS * Math.sin(innerEnd),
  );
  shape.absarc(0, 0, INNER_RADIUS, innerEnd, innerStart, true);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, DEPTH / 2, 0);

  const lift = 0.04;
  geometry.translate(Math.cos(mid) * lift, 0, Math.sin(mid) * lift);

  return geometry;
}

function PieSlice({ startAngle, endAngle, color, segmentKey, activeKey, onActive }) {
  const geometry = useMemo(
    () => createSliceGeometry(startAngle, endAngle),
    [startAngle, endAngle],
  );

  const highlighted = activeKey === segmentKey;

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      onPointerOver={(event) => {
        event.stopPropagation();
        onActive(segmentKey);
      }}
      onPointerOut={() => onActive(null)}
    >
      <meshStandardMaterial
        color={color}
        metalness={0.2}
        roughness={0.4}
        emissive={highlighted ? color : '#000000'}
        emissiveIntensity={highlighted ? 0.45 : 0}
      />
    </mesh>
  );
}

function PieChart({ segments, activeKey, onActive }) {
  const slices = useMemo(() => {
    return segments.reduce((acc, segment) => {
      const sliceAngle = (segment.anglePercent / 100) * Math.PI * 2;
      const start = acc.angle;
      const end = start + sliceAngle;
      acc.items.push({ ...segment, startAngle: start, endAngle: end });
      acc.angle = end;
      return acc;
    }, { angle: -Math.PI / 2, items: [] }).items;
  }, [segments]);

  return (
    <group rotation={[0.35, 0.6, 0]}>
      {slices.map((slice) => (
        <PieSlice
          key={slice.key}
          segmentKey={slice.key}
          startAngle={slice.startAngle}
          endAngle={slice.endAngle}
          color={slice.color}
          activeKey={activeKey}
          onActive={onActive}
        />
      ))}
    </group>
  );
}

function Scene({ segments, received, activeKey, onActive }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <directionalLight position={[-3, 2, -4]} intensity={0.35} />
      <PieChart segments={segments} activeKey={activeKey} onActive={onActive} />
      {received > 0 && (
        <Html center position={[0, 0.15, 0]} style={{ pointerEvents: 'none' }}>
          <div className="financial-breakdown-pie-center">
            <span className="financial-breakdown-pie-center-label">Income</span>
          </div>
        </Html>
      )}
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={9}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

function useContainerReady(ref) {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    function checkSize() {
      setReady(node.clientWidth > 0 && node.clientHeight > 0);
    }

    checkSize();
    const observer = new ResizeObserver(checkSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return ready;
}

export default function FinancialBreakdownPie3D({ segments, received, onHover }) {
  const [activeKey, setActiveKey] = useState(null);
  const containerRef = useRef(null);
  const containerReady = useContainerReady(containerRef);

  function handleActive(key) {
    setActiveKey(key);
    const segment = segments.find((s) => s.key === key) ?? null;
    onHover(segment);
  }

  if (segments.length === 0) {
    return <div className="financial-breakdown-pie-empty">Nothing to chart yet.</div>;
  }

  return (
    <div ref={containerRef} className="financial-breakdown-canvas">
      {containerReady ? (
        <Canvas
          style={{ width: '100%', height: '100%' }}
          camera={{ position: [0, 4.5, 5.5], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene
            segments={segments}
            received={received}
            activeKey={activeKey}
            onActive={handleActive}
          />
        </Canvas>
      ) : (
        <div className="financial-breakdown-canvas--loading">Loading chart…</div>
      )}
    </div>
  );
}
