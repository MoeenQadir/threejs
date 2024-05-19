import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Environment } from '@react-three/drei';
import { animated, useSpring, config } from '@react-spring/three';
import * as THREE from 'three';
import './App.css'; // Assuming you have Tailwind CSS setup in App.css

// Example data
const objects = [
    { id: 1, size: 1, position: { x: -2, y: 0, z: 0 }, connections: [2] },
    { id: 2, size: 1, position: { x: 0, y: 0, z: 0 }, connections: [3] },
    { id: 3, size: 1, position: { x: 2, y: 0, z: 0 }, connections: [] }
];

const objectMap = {};

function Box({ size, position }) {
    const mesh = useRef();
    const texture = useTexture('https://threejsfundamentals.org/threejs/resources/images/wall.jpg');

    // Spring animation
    const { scale } = useSpring({
        from: { scale: [0, 0, 0] },
        to: { scale: [size, size, size] },
        config: config.wobbly
    });

    useFrame(() => {
        if (mesh.current) {
            mesh.current.rotation.y += 0.01;
        }
    });

    return (
        <animated.mesh ref={mesh} position={[position.x, position.y, position.z]} scale={scale} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial map={texture} metalness={0.8} roughness={0.2} />
        </animated.mesh>
    );
}

function Pipe({ start, end }) {
    const path = new THREE.CatmullRomCurve3([start, end]);
    const tubularSegments = 64;
    const radius = 0.1;
    const radialSegments = 8;
    const closed = false;
    const tubeGeometry = new THREE.TubeGeometry(path, tubularSegments, radius, radialSegments, closed);

    return (
        <mesh geometry={tubeGeometry} castShadow receiveShadow>
            <meshStandardMaterial color="gold" metalness={1} roughness={0.5} />
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
            {steps.map((obj, i) => (
                <React.Fragment key={obj.id}>
                    <Box size={obj.size} position={obj.position} />
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
                camera={{ position: [5, 5, 5], fov: 60 }}
                onCreated={({ gl }) => {
                    gl.shadowMap.enabled = true;
                    gl.shadowMap.type = THREE.PCFSoftShadowMap;
                }}
            >
                <ambientLight intensity={0.6} />
                <directionalLight
                    position={[10, 10, 10]}
                    intensity={1}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                    shadow-camera-far={50}
                    shadow-camera-left={-10}
                    shadow-camera-right={10}
                    shadow-camera-top={10}
                    shadow-camera-bottom={-10}
                />
                <OrbitControls />
                <Environment preset="city" />
                <Scene />
            </Canvas>
        </div>
    );
}
