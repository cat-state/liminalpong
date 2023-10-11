import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import { Canvas, extend, useFrame, } from '@react-three/fiber';
import { CameraControls,  Effects, Gltf, KeyboardControls, MeshTransmissionMaterial, Outlines, PerspectiveCamera, Trail, useKeyboardControls } from '@react-three/drei';
import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon'
import { DoubleSide, Mesh, Vector3 } from 'three';
import { UnrealBloomPass } from 'three-stdlib'

extend({ UnrealBloomPass });

const lerp = (start, end, amt) => end * amt + start * (1 - amt);

enum BothControls {
    player1Up = "player1Up",
    player1Down = "player1Down",
    player1Left = "player1Left",
    player1Right = "player1Right",
    player2Up = "player2Up",
    player2Down = "player2Down",
    player2Left = "player2Left",
    player2Right = "player2Right",
}

enum PlayerControls {
    Up = "Up",
    Down = "Down",
    Left = "Left",
    Right = "Right",
}

const usePlayerControls = player => {
    const [sub, get] = useKeyboardControls<BothControls>();
    return (key: PlayerControls) => get()[`player${player}${key}`];
}

const Paddle = ({ position, player, color }) => {
    const alpha = 0.9;
    const moveVelocity = 2.0;

    const getControl = usePlayerControls(player);

    const [ref, api] = useBox(() => ({
        type: 'Dynamic',
        position: position,
        args: [2, 2, 0.1],
        restituion: 1.0,

    }), useRef<Mesh>(null));

    const currVelocity = useRef([0, 0, 0]);
    useEffect(() =>
        api.velocity.subscribe(v => {
            currVelocity.current = v; 
            if(ref.current) ref.current.userData.velocity = v;
        }), 
    []);
    useFrame(() => {
        api.velocity.set(currVelocity.current[0] * alpha, currVelocity.current[1] * alpha, 0)
        if (getControl(PlayerControls.Up)) {
            api.velocity.set(currVelocity.current[0] * alpha, moveVelocity, 0)
        }
        if (getControl(PlayerControls.Down)) {
            api.velocity.set(currVelocity.current[0] * alpha, -moveVelocity, 0)
        }
        if (getControl(PlayerControls.Left)) {
            api.velocity.set(-moveVelocity, currVelocity.current[1] * alpha, 0)
        }
        if (getControl(PlayerControls.Right)) {
            api.velocity.set(moveVelocity, currVelocity.current[1] * alpha, 0)
        }
    });

    return (
        <mesh position={position} ref={ref}>
            <boxGeometry args={[2, 2, 0.1]} />
            <meshStandardMaterial color={color} opacity={0.3} transparent wireframe emissive={color} emissiveIntensity={10.0} />
        </mesh>
    );
};

const Tunnel = () => {
    return <Gltf 
    rotation={[0.0, Math.PI / 2, 0.0]}
    position={[0.0, 1.0, 0.0]}
    scale={[8.0, 8.0, 8.0]} 
    src="/tunnel_textured_mesh_glb.glb" 
    receiveShadow>
    </Gltf>
}

const Walls = ({ width = 6, height = 6, depth = 6}) => {
    const [floorRef, floorApi] = usePlane(() => ({
        type: 'Static',
        position: [0, height/2, 0],
        rotation: [Math.PI / 2, 0, 0],
    }));

    const [ceilingRef, ceilingApi] = usePlane(() => ({
        type: 'Static',
        position: [0, -height/2, 0.0],
        rotation: [-Math.PI / 2, 0, 0],
    }));

    const [leftWallRef, leftWallApi] = usePlane(() => ({
        type: 'Static',
        position: [-width/2, 0, 0],
        rotation: [0, Math.PI / 2, 0],
    }));

    const [rightWallRef, rightWallApi] = usePlane(() => ({
        type: 'Static',
        position: [width/2, 0, 0],
        rotation: [0, -Math.PI / 2, 0],
    }));

    // const [backWallRef, backWallApi] = usePlane(() => ({
    //     type: 'Static',
    //     position: [0, 0, -depth/2],
    //     rotation: [0, 0, 0],
    // }));

    // const [frontWallRef, frontWallApi] = usePlane(() => ({
    //     type: 'Static',
    //     position: [0, 0, depth/2],
    //     rotation: [0, Math.PI, 0],
    // }));

    return (
        <>
            {/* <mesh ref={floorRef} receiveShadow>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial color={'gray'} side={DoubleSide} wireframe />
            </mesh>
            <mesh ref={ceilingRef} receiveShadow>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial color={'gray'}  side={DoubleSide} wireframe />
            </mesh>
            <mesh ref={leftWallRef} receiveShadow>
                <planeGeometry args={[depth, height]} />
                <meshStandardMaterial color={'gray'}  side={DoubleSide} wireframe />
            </mesh>
            <mesh ref={rightWallRef} receiveShadow>
                <planeGeometry args={[depth, height]} />
                <meshStandardMaterial color={'gray'}  side={DoubleSide} wireframe />
            </mesh>
            <mesh ref={backWallRef} receiveShadow>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color={'blue'} wireframe />
            </mesh>
            <mesh ref={frontWallRef} receiveShadow>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color={'red'} wireframe />
            </mesh> */}
            <Tunnel />
        </>
    );
};

const Ball = ({ position, dispatch }) => {
    const [ref, api] = useSphere(() => ({
        type: 'Dynamic',
        position: position,
        velocity: [0, 0, -4],
        mass: 1,
        args: [0.5],
        onCollide: (e) => {
            api.applyLocalImpulse(e.body.userData.velocity, [0, 0, 0]);
        },
    }), useRef<Mesh>(null));

    const currVelocity = useRef(new Vector3());
    useEffect(() =>
        api.velocity.subscribe(v => {
            currVelocity.current.set(v[0], v[1], v[2]); 
            if(ref.current) ref.current.userData.velocity = v;
        }), 
    []);
    const currPosition = useRef(new Vector3());
    useEffect(() =>
        api.position.subscribe(v => {
            currPosition.current.set(v[0], v[1], v[2]); 
            if(ref.current) ref.current.userData.position = v;
        }), 
    []);

    useFrame(() => {
        if(!ref.current) return;
        const velocity = currVelocity.current;
        if(velocity.length() < 2.0 && velocity.length() > 0.0) {
            const normed = velocity.normalize().multiplyScalar(2.0);
            api.velocity.set(normed.x, normed.y, normed.z);
        }
        if (currPosition.current.z > 20.0) {
            dispatch({ type: 'playerscore', player: 0 });
            api.velocity.set(0, 0, -4);
            api.position.set(0, 0, 0);
        }
        if (currPosition.current.z < -20.0) {
            dispatch({ type: 'playerscore', player: 1 });
            api.velocity.set(0, 0, 4);
            api.position.set(0, 0, 0);
        }
    })

    return (
        <mesh position={position} ref={ref}>
            <pointLight color={'white'} intensity={10.0} decay={1.0} />
            <sphereGeometry args={[0.3, 32, 32]}  />
            <meshStandardMaterial color={'white'} emissive={'white'} emissiveIntensity={2.0} />
            <Outlines thickness={0.01} />
        </mesh>
    );
}

const PlayerArea = ({ dispatch }) => {
    return (
        <mesh>
            <group position={[0.0, 1.0, 0.0]}>
            {/* <pointLight color={'white'} intensity={10.0} decay={1.0} castShadow/>     */}
            </group>
            <meshStandardMaterial color={'gray'} />
            <Paddle position={[0, 0, 6]} player={1} color={'red'} />
            <Paddle position={[0, 0, -6]} player={2} color={'blue'} />
            <Ball position={[0, 0, 0]} dispatch={dispatch} />
            <Walls depth={12} width={10} />
        </mesh>
    );
};

type PlayerScore = {
    type: 'playerscore',
    player: number,
};

type State = {
    scores: [number, number],
    level: number,
}

const initState: State = {
    scores: [0, 0],
    level: 0,
};

export const App = () => {
    const [state, dispatch] = useReducer((state, action: PlayerScore) => {
        switch (action.type) {
            case 'playerscore':
                return {...state, scores: state.scores.map((s, i) => i === action.player ? s + 1 : s)}
            default:
                return state;
        }
    }, initState);

    const keyMap = useMemo(() => [
        { name: BothControls.player1Up, keys: ['KeyW'] },
        { name: BothControls.player1Down, keys: ['KeyS'] },
        { name: BothControls.player1Left, keys: ['KeyA'] },
        { name: BothControls.player1Right, keys: ['KeyD'] },
        { name: BothControls.player2Up, keys: ['ArrowUp'] },
        { name: BothControls.player2Down, keys: ['ArrowDown'] },
        { name: BothControls.player2Left, keys: ['ArrowLeft'] },
        { name: BothControls.player2Right, keys: ['ArrowRight'] },
    ], [])

    return (
        <Canvas shadows>
            <PerspectiveCamera position={[0, 0, 9]} fov={90}  makeDefault/>
            <color attach={'background'} args={['black']} />
            <fog attach="fog" args={['black', 12, 20]} />
            <Effects disableGamma>
                <unrealBloomPass threshold={1} strength={1.0} radius={0.1} />
            </Effects>
    
            <KeyboardControls map={keyMap}>
            {/* <CameraControls /> */}
            {/* <ambientLight intensity={0.1} /> */}
            {/* <directionalLight color="white" position={[2, 5, 1]} /> */}
            {/* <mesh position={[0, 0, -2.2]}>
                <boxGeometry args={[5, 5, 6]} />
                <meshStandardMaterial color={'white'} wireframe />
            </mesh> */}
            <Physics gravity={[0.0, 0.0, 0.0]} defaultContactMaterial={{ restitution: 1.0 }} >
            <PlayerArea dispatch={dispatch} />
            </Physics>
            </KeyboardControls>
        </Canvas>
    );
};
