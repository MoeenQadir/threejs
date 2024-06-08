import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { animated, useSpring, config } from '@react-spring/three';
import * as THREE from 'three';
import './App.css';

const objects = [
    { id: 1, size: 0.5, position: { x: 0, y: -0.1, z: 0 }, connections: [2, 3, 5] },
    { id: 2, size: 0.5, position: { x: -2, y: -0.1, z: 0 }, connections: [4] },
    { id: 3, size: 0.5, position: { x: 2, y: -0.1, z: 0 }, connections: [6] },
    { id: 4, size: 0.5, position: { x: -2, y: -0.1, z: 2 }, connections: [] },
    { id: 5, size: 0.5, position: { x: 0, y: -0.1, z: 2 }, connections: [7] },
    { id: 6, size: 0.5, position: { x: 2, y: -0.1, z: 2 }, connections: [] },
    { id: 7, size: 0.5, position: { x: 0, y: -0.1, z: 4 }, connections: [8, 9, 10, 11] },
    { id: 8, size: 0.5, position: { x: -2, y: -0.1, z: 4 }, connections: [] },
    { id: 9, size: 0.5, position: { x: 2, y: -0.1, z: 4 }, connections: [] },
    { id: 10, size: 0.5, position: { x: -4, y: -0.1, z: 4 }, connections: [] },
    { id: 11, size: 0.5, position: { x: 4, y: -0.1, z: 4 }, connections: [] }
];

const objectMap = {};

function Node({ size, position, id }) {
    const mesh = useRef();
    const boxText = useMemo(() => `Node ${id}`, [id]);

    const { scale } = useSpring({
        from: { scale: [0, 0, 0] },
        to: { scale: [size, size, size] },
        config: config.default
    });

    return (
        <group>
            <animated.mesh ref={mesh} position={[position.x, position.y, position.z]} scale={scale} castShadow receiveShadow>
                <cylinderGeometry args={[1.5, 1.5, 1, 62]} />
                <meshStandardMaterial color="red" metalness={0.8} roughness={0.6} />
                <Html position={[0, 0.6, 0]} center>
                    <div style={{ color: 'white', fontSize: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {boxText}
                    </div>
                </Html>
            </animated.mesh>
        </group>
    );
}

function Pipe({ start, end }) {
    const path = new THREE.CatmullRomCurve3([start, end]);
    const tubularSegments = 40;
    const radius = 0.05;
    const radialSegments = 4;
    const closed = false;
    const tubeGeometry = new THREE.TubeGeometry(path, tubularSegments, radius, radialSegments, closed);

    const neonMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color('cyan') },
            time: { value: 1.0 }
        },
        vertexShader: `
            varying vec3 vUv; 
            void main() {
                vUv = position; 
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); 
            }
        `,
        fragmentShader: `
            uniform vec3 color; 
            uniform float time; 
            varying vec3 vUv; 
            void main() {
                float glow = sin(vUv.y * 3.0 + time * 3.0) * 0.5 + 0.5; 
                gl_FragColor = vec4(color * glow, 1.0); 
            }
        `
    });

    useFrame(({ clock }) => {
        neonMaterial.uniforms.time.value = clock.getElapsedTime();
    });

    return (
        <mesh geometry={tubeGeometry} castShadow receiveShadow material={neonMaterial} />
    );
}

function MetallicGrid() {
    const gridRef = useRef();

    useFrame(() => {
        if (gridRef.current) {
            gridRef.current.position.set(0, -1, 0);
        }
    });

    return (
        <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#282828" metalness={1} roughness={0.1} />
        </mesh>
    );
}

function Scene() {
    const [steps, setSteps] = useState([]);

    useEffect(() => {
        objects.forEach((obj, index) => {
            setTimeout(() => {
                setSteps(prev => [...prev, obj]);
            }, index * 1000);
        });

        objects.forEach(obj => {
            objectMap[obj.id] = obj.position;
        });
    }, []);

    return (
        <>
            {steps.map(obj => (
                <React.Fragment key={obj.id}>
                    <Node size={obj.size} position={obj.position} id={obj.id} />
                    {obj.connections.map(connId => {
                        const start = objectMap[obj.id];
                        const end = objectMap[connId];
                        if (start && end) {
                            return <Pipe key={`${obj.id}-${connId}`} start={new THREE.Vector3(start.x, start.y, start.z)} end={new THREE.Vector3(end.x, end.y, end.z)} />;
                        } else {
                            console.warn(`Cannot create connection from ${obj.id} to ${connId}`);
                            return null;
                        }
                    })}
                </React.Fragment>
            ))}
        </>
    );
}

export default function App() {
    return (
        <div className="h-screen w-full">
            <Canvas
                shadows
                gl={{ alpha: false, antialias: true }}
                camera={{ position: [0, 5, 10], fov: 60 }}
                onCreated={({ gl }) => {
                    gl.shadowMap.enabled = true;
                    gl.shadowMap.type = THREE.PCFSoftShadowMap;
                }}
            >
                <ambientLight intensity={0.6} />
                <directionalLight
                    position={[10, 10, 10]}
                    intensity={4}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                    shadow-camera-far={50}
                    shadow-camera-left={-10}
                    shadow-camera-right={10}
                    shadow-camera-top={10}
                    shadow-camera-bottom={-10}
                    color="red"
                />
                <OrbitControls />
                <Environment preset="city" />
                <MetallicGrid />
                <Scene />
            </Canvas>
        </div>
    );
}
