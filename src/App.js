import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { ChromePicker } from 'react-color';
import './App.css'; // Assuming you have Tailwind CSS setup in App.css

const initialObjects = [
    { id: 1, size: 0.5, position: { x: 0, y: 0, z: 0 }, connections: [2, 3, 5], color: 'red', label: 'Node 1' },
    { id: 2, size: 0.5, position: { x: -2, y: 0, z: 0 }, connections: [4], color: 'red', label: 'Node 2' },
    { id: 3, size: 0.5, position: { x: 2, y: 0, z: 0 }, connections: [6], color: 'red', label: 'Node 3' },
    { id: 4, size: 0.5, position: { x: -2, y: 0, z: 2 }, connections: [], color: 'red', label: 'Node 4' },
    { id: 5, size: 0.5, position: { x: 0, y: 0, z: 2 }, connections: [7], color: 'red', label: 'Node 5' },
    { id: 6, size: 0.5, position: { x: 2, y: 0, z: 2 }, connections: [], color: 'red', label: 'Node 6' },
    { id: 7, size: 0.5, position: { x: 0, y: 0, z: 4 }, connections: [8, 9, 10, 11], color: 'red', label: 'Node 7' },
    { id: 8, size: 0.5, position: { x: -2, y: 0, z: 4 }, connections: [], color: 'red', label: 'Node 8' },
    { id: 9, size: 0.5, position: { x: 2, y: 0, z: 4 }, connections: [], color: 'red', label: 'Node 9' },
    { id: 10, size: 0.5, position: { x: -4, y: 0, z: 4 }, connections: [], color: 'red', label: 'Node 10' },
    { id: 11, size: 0.5, position: { x: 4, y: 0, z: 4 }, connections: [], color: 'red', label: 'Node 11' }
];

const objectMap = {};

function Node({ size, position, id, color, label, onClick }) {
    const mesh = useRef();
    const scale = useMemo(() => [size, size, size], [size]);

    return (
        <group>
            <animated.mesh
                ref={mesh}
                position={[position.x, position.y, position.z]}
                scale={scale}
                castShadow
                receiveShadow
                onClick={() => onClick(id)}
            >
                <cylinderGeometry args={[1.5, 1.5, 1, 32]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />
                <Html position={[0, 1, 0]} center>
                    <div style={{ color: 'white', fontSize: '10px', textAlign: 'center', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                        {label}
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

function Scene({ objects, onClickNode }) {
    return (
        <>
            {objects.map(obj => (
                <React.Fragment key={obj.id}>
                    <Node {...obj} onClick={onClickNode} />
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
    const [objects, setObjects] = useState(initialObjects);
    const [form, setForm] = useState({ id: '', size: '', x: '', y: '', z: '', color: '', connections: '', label: '' });
    const [selectedId, setSelectedId] = useState(null);
    const [error, setError] = useState('');
    const [showColorPicker, setShowColorPicker] = useState(false);

    useEffect(() => {
        objects.forEach(obj => {
            objectMap[obj.id] = obj.position;
        });
    }, [objects]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleColorChange = (color) => {
        setForm({ ...form, color: color.hex });
    };

    const handleAddNode = (e) => {
        e.preventDefault();
        try {
            const newObjects = [...objects];
            const newNode = {
                id: parseInt(form.id),
                size: parseFloat(form.size),
                position: { x: parseFloat(form.x), y: parseFloat(form.y), z: parseFloat(form.z) },
                color: form.color,
                connections: form.connections.split(',').map(conn => parseInt(conn)),
                label: form.label
            };
            if (selectedId !== null) {
                const index = newObjects.findIndex(obj => obj.id === selectedId);
                newObjects[index] = newNode;
            } else {
                newObjects.push(newNode);
            }
            setObjects(newObjects);
            setForm({ id: '', size: '', x: '', y: '', z: '', color: '', connections: '', label: '' });
            setSelectedId(null);
            setError('');
        } catch (err) {
            setError('Invalid input format');
        }
    };

    const handleNodeClick = (id) => {
        const node = objects.find(obj => obj.id === id);
        if (node) {
            setForm({
                id: node.id.toString(),
                size: node.size.toString(),
                x: node.position.x.toString(),
                y: node.position.y.toString(),
                z: node.position.z.toString(),
                color: node.color,
                connections: node.connections.join(','),
                label: node.label
            });
            setSelectedId(id);
        }
    };

    return (
        <div className="h-screen w-full relative">
            <form className="absolute top-1 left-0 z-10 w-1/5 rounded-md p-4 bg-white border border-gray-400" onSubmit={handleAddNode}>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label>ID</label>
                        <input type="number" name="id" value={form.id} onChange={handleChange} required className="w-full p-1 border border-gray-300 rounded" />
                    </div>
                    <div>
                        <label>Size</label>
                        <input type="number" name="size" step="0.1" value={form.size} onChange={handleChange} required className="w-full p-1 border border-gray-300 rounded" />
                    </div>
                    <div>
                        <label>X</label>
                        <input type="number" name="x" step="0.1" value={form.x} onChange={handleChange} required className="w-full p-1 border border-gray-300 rounded" />
                    </div>
                    <div>
                        <label>Y</label>
                        <input type="number" name="y" step="0.1" value={form.y} onChange={handleChange} required className="w-full p-1 border border-gray-300 rounded" />
                    </div>
                    <div>
                        <label>Z</label>
                        <input type="number" name="z" step="0.1" value={form.z} onChange={handleChange} required className="w-full p-1 border border-gray-300 rounded" />
                    </div>
                    <div onMouseEnter={() => setShowColorPicker(true)} onMouseLeave={() => setShowColorPicker(false)}>
                        <label>Color</label>
                        <div className="w-full p-4 border border-gray-300 rounded" style={{ backgroundColor: form.color }}></div>
                        {showColorPicker && (
                            <div className="absolute z-20">
                                <ChromePicker color={form.color} onChange={handleColorChange} />
                            </div>
                        )}
                    </div>
                </div>
                  <div className={"grid grid-cols-2 gap-2"}>
                      <div>
                          <label>Connections</label>
                          <input type="text" name="connections" value={form.connections} onChange={handleChange} className="w-full p-1 border border-gray-300 rounded" />
                      </div>
                      <div>
                          <label>Label</label>
                          <input type="text" name="label" value={form.label} onChange={handleChange} required className="w-full p-1 border border-gray-300 rounded" />
                      </div>

                  </div>
                <div className={"flex justify-center items-center"}>
                    <button type="submit" className="mt-4 bg-[#dd000f] text-white py-2 px-4 rounded">{selectedId !== null ? 'Update Node' : 'Add Node'}</button>
                </div>
            </form>
            {error && (
                <div className="absolute top-0 left-0 z-20 w-full p-2 bg-red-500 text-white">
                    Error: {error}
                </div>
            )}
            <Canvas
                shadows
                gl={{ alpha: false, antialias: true }}
                camera={{ position: [0, 5, 10], fov: 60 }}
                onCreated={({ gl }) => {
                    gl.shadowMap.enabled = true;
                    gl.shadowMap.type = THREE.PCFSoftShadowMap;
                }}
                className="absolute top-0 left-0 w-full h-full"
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
                    color="white"
                />
                <OrbitControls />
                <Environment preset="city" />
                <MetallicGrid />
                <Scene objects={objects} onClickNode={handleNodeClick} />
            </Canvas>
        </div>
    );
}
