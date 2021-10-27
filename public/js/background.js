import * as THREE from 'three'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";


// Setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});


renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);
camera.position.setY(10);
// camera.position.setX(-3);

renderer.render(scene, camera);

window.addEventListener(
  "resize",
  () => {
    OnWindowResize();
  },
  false
);


// Torus
// const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
// const material = new THREE.MeshStandardMaterial({ color: 0xff6347 });
// const torus = new THREE.Mesh(geometry, material);

// scene.add(torus);


//fractal
// let fractal;
// function gltfLoad(filepath) {
//   const loader = new GLTFLoader(manager);
//   loader.load(filepath, (gltf) => {
//       gltf.scene.traverse((c) => {
//           c.castShadow = true;
//       });
//       gltf.scene.scale.set(0.01, 0.01, 0.01);
//       fractal = gltf.scene;
//       scene.add(fractal);
//       animate();
//   },
//       // called while loading is progressing
//       xhr => {

//           // Entity.params.loadingBar.update('character', xhr.loaded, xhr.total);

//       },
//       // called when loading has errors
//       err => {

//           console.error(err);

//       }
//   )
// }
// gltfLoad('/3d/scene.gltf')

// Lights
const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(pointLight, ambientLight);


// Background
const spaceTexture = new THREE.TextureLoader().load('images/universe.jpg');
scene.background = spaceTexture;

// moon
const moonTexture = new THREE.TextureLoader().load('3d/moon/moon.jpg');
const normalTexture = new THREE.TextureLoader().load('3d/moon/normal.jpg');

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(3, 32, 32),
  new THREE.MeshStandardMaterial({
    map: moonTexture,
    normalMap: normalTexture,
  })
);

moon.scale.set(3,3,3)
moon.position.z = 10
moon.position.y = 20
scene.add(moon);

//scrolling
function moveCamera() {
  const t = document.body.getBoundingClientRect().top;

  camera.position.z = 150 - Math.log(Math.abs(t-100)) * 14;
  // console.log(camera.position.z)
  // camera.position.x = t * -0.0002;
  // camera.rotation.y = t * -0.0002;
}

document.body.onscroll = moveCamera;
moveCamera();


// Animation Loop
function animate() {
    requestAnimationFrame(animate);
  
    // fractal.rotation.x += 0.01;
    // fractal.rotation.y += 0.01;
    // fractal.rotation.z += 0.01;
  
    moon.rotation.y += 0.005;
  
    // controls.update();
  
    renderer.render(scene, camera);
  }
animate();
  
  


function OnWindowResize() {
  // Update sizes
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}




