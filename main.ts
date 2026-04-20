import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 6.1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#fafafa';
document.body.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.08);
scene.environment = environment.texture;
pmremGenerator.dispose();

const ambientLight = new THREE.HemisphereLight(0xffffff, 0xb7b7b7, 0.3);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(5.5, 7, 8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xd9d9d9, 0.65);
fillLight.position.set(-4.5, -1.2, 6);
scene.add(fillLight);

const kickLight = new THREE.PointLight(0xffffff, 42, 15, 2);
kickLight.position.set(-2.4, 0.4, 4.6);
scene.add(kickLight);

const rimLight = new THREE.PointLight(0xffffff, 18, 14, 2);
rimLight.position.set(3.2, 1.8, -3.4);
scene.add(rimLight);

const rig = new THREE.Group();
rig.position.y = 0.26;
scene.add(rig);

const rawGeometry = new THREE.BoxGeometry(1.9, 1.9, 1.9, 56, 56, 56);
const blobGeometry = mergeVertices(rawGeometry);
blobGeometry.computeVertexNormals();

const blobUniforms = {
  uTime: { value: 0 },
  uPulse: { value: 0 },
  uSeed: { value: new THREE.Vector3(1.9, 3.7, 5.1) },
};

const blobMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x010101,
  metalness: 1,
  roughness: 0.18,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  envMapIntensity: 2.2,
});

blobMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = blobUniforms.uTime;
  shader.uniforms.uPulse = blobUniforms.uPulse;
  shader.uniforms.uSeed = blobUniforms.uSeed;

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
uniform float uTime;
uniform float uPulse;
uniform vec3 uSeed;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise3d(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);

  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.55;
  for (int i = 0; i < 5; i++) {
    value += noise3d(p) * amplitude;
    p = p * 2.02 + vec3(7.1, 13.4, 5.7);
    amplitude *= 0.5;
  }
  return value;
}

float ridge(vec3 p) {
  float value = 0.0;
  float amplitude = 0.55;
  for (int i = 0; i < 4; i++) {
    float n = noise3d(p);
    value += (1.0 - abs(n * 2.0 - 1.0)) * amplitude;
    p = p * 2.3 + vec3(8.2, 1.7, 5.3);
    amplitude *= 0.56;
  }
  return value;
}

vec3 cubeDirection(vec3 p) {
  vec3 a = abs(p) + 0.0001;
  return normalize(sign(p) * pow(a, vec3(1.1)));
}

vec3 orthogonal(vec3 v) {
  return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y));
}

vec3 displacedPosition(vec3 p) {
  vec3 dir = cubeDirection(p);
  float flow = fbm(p * 1.15 + uSeed + vec3(uTime * 0.12, -uTime * 0.08, uTime * 0.1));
  float crumple = ridge(p * 5.3 + flow * 2.4 + uSeed * 0.7);
  float layered = ridge(vec3(p.xy * 8.0, p.z * 2.0) - vec3(uTime * 0.24, -uTime * 0.18, uTime * 0.14));
  float gouge = ridge(vec3(p.yz * 7.0, p.x * 1.7) + vec3(-uTime * 0.21, uTime * 0.17, -uTime * 0.13));
  float crease = sin((p.x - p.z) * 7.4 + flow * 5.2 - uTime * 1.2) * 0.018;
  float pulse = smoothstep(-0.2, 0.95, p.y) * uPulse * 0.08;
  float bulk = 0.06 + crumple * 0.19 + layered * 0.08 + gouge * 0.06 + crease + pulse;
  return p + dir * bulk;
}
`
    )
    .replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
vec3 displaced = displacedPosition(position);
vec3 tangent = orthogonal(normal);
vec3 bitangent = normalize(cross(normal, tangent));
vec3 displacedTangent = displacedPosition(position + tangent * 0.02);
vec3 displacedBitangent = displacedPosition(position + bitangent * 0.02);
objectNormal = normalize(cross(displacedTangent - displaced, displacedBitangent - displaced));
`
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
transformed = displacedPosition(position);
`
    );
};

blobMaterial.customProgramCacheKey = () => 'black-metal-symbiote-v2';

const blob = new THREE.Mesh(blobGeometry, blobMaterial);
blob.scale.set(0.72, 0.8, 0.72);
rig.add(blob);

const base = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 1.34, 0.28, 72),
  new THREE.MeshPhysicalMaterial({
    color: 0xf1f1f1,
    metalness: 0.08,
    roughness: 0.9,
    clearcoat: 0.2,
    clearcoatRoughness: 0.45,
  })
);
base.position.y = -1.24;
scene.add(base);

const pointerTarget = new THREE.Vector2();
const pointerCurrent = new THREE.Vector2();
let pointerEnergy = 0;

window.addEventListener('pointermove', (event) => {
  const nextX = (event.clientX / window.innerWidth) * 2 - 1;
  const nextY = 1 - (event.clientY / window.innerHeight) * 2;
  pointerEnergy = Math.min(
    1,
    pointerEnergy + Math.hypot(nextX - pointerTarget.x, nextY - pointerTarget.y) * 0.6
  );
  pointerTarget.set(nextX, nextY);
});

window.addEventListener('pointerleave', () => {
  pointerTarget.set(0, 0);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.elapsedTime;
  const follow = 1 - Math.exp(-dt * 4);

  pointerCurrent.lerp(pointerTarget, follow);
  pointerEnergy *= Math.exp(-dt * 2.8);

  blobUniforms.uTime.value = elapsed;
  blobUniforms.uPulse.value = THREE.MathUtils.lerp(blobUniforms.uPulse.value, pointerEnergy, follow);

  rig.position.x = THREE.MathUtils.lerp(rig.position.x, pointerCurrent.x * 0.18, follow);
  rig.position.y = THREE.MathUtils.lerp(rig.position.y, 0.26 + pointerCurrent.y * 0.12, follow);

  rig.rotation.x = -0.26 + pointerCurrent.y * 0.16 + Math.sin(elapsed * 0.32) * 0.05;
  rig.rotation.y = 0.42 - pointerCurrent.x * 0.3 + Math.sin(elapsed * 0.24) * 0.08;
  rig.rotation.z = Math.sin(elapsed * 0.18) * 0.05;

  const breathe = 1 + Math.sin(elapsed * 0.65) * 0.01 + blobUniforms.uPulse.value * 0.014;
  blob.scale.set(0.72 * breathe, 0.8 - Math.sin(elapsed * 0.7 + 0.8) * 0.012, 0.72 * breathe);

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointerCurrent.x * 0.14, follow * 0.7);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, pointerCurrent.y * 0.08, follow * 0.7);
  camera.lookAt(rig.position.x * 0.35, rig.position.y * 0.25, 0);

  kickLight.position.x = -2.2 + Math.sin(elapsed * 0.5) * 0.6;
  kickLight.position.y = 0.4 + Math.cos(elapsed * 0.4) * 0.25;
  rimLight.position.x = 3.1 + Math.cos(elapsed * 0.35) * 0.7;

  renderer.render(scene, camera);
});
