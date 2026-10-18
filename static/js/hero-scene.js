/*
 * Hero 3D scene for Hugo Portfolio Template.
 * A lightweight, procedural Three.js kinetic orbital sphere with interactive OrbitControls.
 *
 * Features:
 * - Dynamic light/dark theme adaptation
 * - Respects prefers-reduced-motion & saveData
 * - Pauses rendering when offscreen (IntersectionObserver)
 * - Zero external 3D file dependencies
 */

async function initHeroScene() {
  const canvas = document.getElementById('hero-scene');
  if (!canvas) return;

  if (window.innerWidth <= 900) return;
  if (navigator.connection && navigator.connection.saveData) return;

  try {
    const probe = document.createElement('canvas');
    const gl =
      probe.getContext('webgl2') ||
      probe.getContext('webgl') ||
      probe.getContext('experimental-webgl');
    if (!gl) return;
  } catch (e) {
    return;
  }

  let THREE;
  let OrbitControls;
  try {
    THREE = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
  } catch (e) {
    return;
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wrap = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 1.2, 3.8);

  const mainGroup = new THREE.Group();
  scene.add(mainGroup);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0xdfe6ff, 1.2);
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(5, 6, 4);
  const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
  fillLight.position.set(-5, 2, 3);
  const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
  rimLight.position.set(0, -3, -4);
  scene.add(hemi, keyLight, fillLight, rimLight);

  const coreLight = new THREE.PointLight(0x0284c7, 2.2, 6, 1.5);
  coreLight.position.set(0, 0, 0);
  scene.add(coreLight);

  const isDark = () => {
    const sheet = document.getElementById('dark-theme');
    return sheet ? !sheet.disabled : false;
  };

  // Materials
  const primaryRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f46e5,
    metalness: 0.85,
    roughness: 0.25
  });

  const secondaryRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.8,
    roughness: 0.3
  });

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x0284c7,
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.1
  });

  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.2
  });

  function applyTheme() {
    const dark = isDark();
    if (dark) {
      hemi.color.setHex(0xe2e8f0);
      hemi.groundColor.setHex(0x0f172a);
      hemi.intensity = 1.0;
      keyLight.intensity = 2.2;
      coreLight.intensity = 3.0;
      primaryRingMaterial.color.setHex(0x818cf8);
      secondaryRingMaterial.color.setHex(0x38bdf8);
      coreMaterial.emissive.setHex(0x38bdf8);
      nodeMaterial.color.setHex(0x7dd3fc);
    } else {
      hemi.color.setHex(0xffffff);
      hemi.groundColor.setHex(0xcbd5e1);
      hemi.intensity = 1.3;
      keyLight.intensity = 1.9;
      coreLight.intensity = 2.0;
      primaryRingMaterial.color.setHex(0x4338ca);
      secondaryRingMaterial.color.setHex(0x0284c7);
      coreMaterial.emissive.setHex(0x0284c7);
      nodeMaterial.color.setHex(0x0284c7);
    }
  }
  applyTheme();

  function createRing(radius, tube, mat) {
    const geo = new THREE.TorusGeometry(radius, tube, 24, 96);
    return new THREE.Mesh(geo, mat);
  }

  // Ring 1 (Outer Equator)
  const ring1 = createRing(1.3, 0.02, primaryRingMaterial);
  ring1.rotation.x = Math.PI / 2;
  mainGroup.add(ring1);

  // Ring 2 (Tilted Orbit)
  const ring2Group = new THREE.Group();
  ring2Group.rotation.z = Math.PI / 6;
  const ring2 = createRing(1.22, 0.022, secondaryRingMaterial);
  ring2.rotation.x = Math.PI / 2.5;
  ring2Group.add(ring2);
  mainGroup.add(ring2Group);

  // Nodes along Ring 2
  const nodeCount = 12;
  const nodeGeo = new THREE.SphereGeometry(0.026, 16, 16);
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const node = new THREE.Mesh(nodeGeo, nodeMaterial);
    node.position.set(
      Math.cos(angle) * 1.22,
      0,
      Math.sin(angle) * 1.22
    );
    ring2.add(node);
  }

  // Ring 3 (Polar Meridian)
  const ring3 = createRing(1.15, 0.016, primaryRingMaterial);
  mainGroup.add(ring3);

  // Central Core Sphere & Inner Orbit
  const coreGroup = new THREE.Group();
  const sunGeo = new THREE.SphereGeometry(0.24, 32, 32);
  const sunMesh = new THREE.Mesh(sunGeo, coreMaterial);
  coreGroup.add(sunMesh);

  const innerRing = createRing(0.42, 0.012, secondaryRingMaterial);
  innerRing.rotation.x = Math.PI / 3;
  coreGroup.add(innerRing);
  mainGroup.add(coreGroup);

  // Floating particles
  const particleCount = 60;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = 0.5 + Math.random() * 1.1;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI;
    positions[i * 3] = r * Math.cos(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi);
    positions[i * 3 + 2] = r * Math.cos(phi) * Math.sin(theta);
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.024,
    transparent: true,
    opacity: 0.7
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  mainGroup.add(particles);

  mainGroup.rotation.x = 0.2;
  mainGroup.rotation.y = -0.3;

  // OrbitControls
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.6;
  controls.minDistance = 2.0;
  controls.maxDistance = 6.5;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.5;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });
  controls.addEventListener('change', () => renderer.render(scene, camera));

  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  let visible = true;
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting && !document.hidden;
  }, { threshold: 0.05 });
  observer.observe(wrap);

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
  });

  document.querySelectorAll('.dark-theme-toggle').forEach((el) => {
    el.addEventListener('click', () => {
      setTimeout(applyTheme, 20);
    });
  });

  let clock = new THREE.Clock();
  if (!reduce) {
    (function step() {
      requestAnimationFrame(step);
      if (visible) {
        const delta = clock.getDelta();
        ring2Group.rotation.y += delta * 0.18;
        innerRing.rotation.y -= delta * 0.3;
        coreGroup.rotation.y += delta * 0.1;
        particles.rotation.y += delta * 0.04;
        controls.update();
        renderer.render(scene, camera);
      }
    })();
  } else {
    renderer.render(scene, camera);
  }

  canvas.classList.add('is-ready');
}

initHeroScene().catch(() => {});
