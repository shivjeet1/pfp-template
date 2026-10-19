/*
 * "Shadow Affliction" hero scene for the example site.
 *
 * A self-contained procedural Three.js scene themed around Cid Kagenou:
 * a dark core wrapped in a violet fresnel shell, counter-rotating shadow
 * rings, and drifting motes of consumed time.
 *
 * Design notes:
 * - Depends only on the "three" bare specifier provided by the theme's
 *   importmap, so no OrbitControls (and no addon) is required.
 * - Bails out early on mobile, data-saver, missing WebGL, or failed imports,
 *   leaving the static canvas in place rather than throwing.
 * - Honours prefers-reduced-motion by rendering a single static frame.
 * - Pauses the render loop when the hero scrolls out of view or the tab
 *   is hidden.
 */

async function initShadowScene() {
  const canvas = document.getElementById('hero-scene');
  if (!canvas) return;

  // The hero is decorative; skip the cost on small screens and data-saver.
  if (window.innerWidth <= 900) return;
  if (navigator.connection && navigator.connection.saveData) return;

  // Cheap WebGL probe so unsupported browsers degrade to a blank canvas.
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
  try {
    THREE = await import('three');
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
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.3, 5.2);

  // --- Palette -------------------------------------------------------------
  // The core is near-black in both themes; only the rim and glow carry the
  // violet. On the light theme the orb reads as a hole punched in the page,
  // on the dark theme the rim glow does the work.
  const PALETTE = {
    light: {
      body: 0x0a0410,
      rim: 0x9d3ce0,
      mote: 0x8b3fc4,
      ring: 0x1c0b28,
      glow: 0.34,
      ambient: 0.9
    },
    dark: {
      body: 0x160826,
      rim: 0xc06bff,
      mote: 0xa259e0,
      ring: 0x0d0414,
      glow: 0.5,
      ambient: 0.8
    }
  };

  const isDark = () => {
    const sheet = document.getElementById('dark-theme');
    return sheet ? !sheet.disabled : false;
  };

  // --- The cursed core -----------------------------------------------------
  // A fresnel shell: near-black body, violet rim. The silhouette is fully
  // opaque so the orb keeps a hard edge against both page backgrounds.
  const coreUniforms = {
    uBodyColor: { value: new THREE.Color(PALETTE.light.body) },
    uRimColor: { value: new THREE.Color(PALETTE.light.rim) },
    uTime: { value: 0 },
    uPulse: { value: 1 }
  };

  const coreMaterial = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uBodyColor;
      uniform vec3 uRimColor;
      uniform float uTime;
      uniform float uPulse;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vPosition;

      void main() {
        float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 2.2);

        // Slow vertical drift so the surface never reads as a static sphere.
        float drift = sin(vPosition.y * 3.0 + uTime * 1.1) * 0.5 + 0.5;
        float rim = fresnel * (0.7 + 0.3 * drift) * uPulse;

        gl_FragColor = vec4(mix(uBodyColor, uRimColor, clamp(rim, 0.0, 1.0)), 1.0);
      }
    `
  });

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 5), coreMaterial);
  scene.add(core);

  // Outer glow: a screen-facing sprite with a procedurally generated radial
// falloff. A shell mesh was tried first, but back-face fresnel saturates
// additively into a flat disc; a gradient sprite falls off cleanly.
function makeGlowTexture(hex) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = new THREE.Color(hex);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${rgb},0.55)`);
  grad.addColorStop(0.32, `rgba(${rgb},0.22)`);
  grad.addColorStop(0.62, `rgba(${rgb},0.06)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const glowMaterial = new THREE.SpriteMaterial({
  map: makeGlowTexture(PALETTE.light.rim),
  transparent: true,
  opacity: PALETTE.light.glow,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false
});

const glow = new THREE.Sprite(glowMaterial);
glow.scale.setScalar(3.6);
glow.renderOrder = -1;
scene.add(glow);

  // --- Shadow rings --------------------------------------------------------
  const group = new THREE.Group();
  scene.add(group);

  function makeRing(radius, tube, tilt) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 20, 128),
      new THREE.MeshStandardMaterial({
        color: PALETTE.light.ring,
        metalness: 0.75,
        roughness: 0.35,
        transparent: true,
        opacity: 0.9
      })
    );
    mesh.rotation.x = tilt;
    group.add(mesh);
    return mesh;
  }

  const ringOuter = makeRing(1.45, 0.015, Math.PI / 2.2);
  const ringMid = makeRing(1.22, 0.022, -Math.PI / 3.1);
  const ringInner = makeRing(0.85, 0.012, Math.PI / 4.4);

  // --- Motes of consumed time ---------------------------------------------
  // Drifting upward and fading out, like hours quietly leaving the room.
  const MOTES = 260;
  const positions = new Float32Array(MOTES * 3);
  const speeds = new Float32Array(MOTES);
  const sizes = new Float32Array(MOTES);

  for (let i = 0; i < MOTES; i++) {
    const radius = 1.1 + Math.random() * 1.5;
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 3.2;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    speeds[i] = 0.08 + Math.random() * 0.22;
    sizes[i] = 0.4 + Math.random() * 1.6;
  }

  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  moteGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const moteMaterial = new THREE.PointsMaterial({
    color: PALETTE.light.mote,
    size: 0.035,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  scene.add(motes);

  // --- Lighting ------------------------------------------------------------
  const ambient = new THREE.AmbientLight(0xffffff, PALETTE.light.ambient);
  const keyLight = new THREE.DirectionalLight(0xd8b4ff, 1.6);
  keyLight.position.set(3, 4, 5);
  const fillLight = new THREE.DirectionalLight(0x6b21a8, 1.1);
  fillLight.position.set(-4, -2, -3);
  scene.add(ambient, keyLight, fillLight);

  // --- Theme adaptation ----------------------------------------------------
  function applyTheme() {
    const p = isDark() ? PALETTE.dark : PALETTE.light;
    coreUniforms.uBodyColor.value.setHex(p.body);
    coreUniforms.uRimColor.value.setHex(p.rim);
    glowMaterial.map = makeGlowTexture(p.rim);
    glowMaterial.needsUpdate = true;
    glowMaterial.opacity = p.glow;
    moteMaterial.color.setHex(p.mote);
    moteMaterial.opacity = isDark() ? 0.85 : 0.7;
    [ringOuter, ringMid, ringInner].forEach((r) => r.material.color.setHex(p.ring));
    ambient.intensity = p.ambient;
  }
  applyTheme();

  document.querySelectorAll('.dark-theme-toggle').forEach((el) => {
    el.addEventListener('click', () => {
      setTimeout(applyTheme, 20);
    });
  });

  // --- Layout --------------------------------------------------------------
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

  // --- Pointer parallax ----------------------------------------------------
  // Subtle tilt toward the cursor. Cheaper and calmer than orbit controls,
  // and it keeps the hero from feeling like a spinning logo.
  let targetX = 0;
  let targetY = 0;
  if (!reduce) {
    window.addEventListener(
      'pointermove',
      (e) => {
        targetY = (e.clientX / window.innerWidth - 0.5) * 0.35;
        targetX = (e.clientY / window.innerHeight - 0.5) * 0.22;
      },
      { passive: true }
    );
  }

  // --- Render gating -------------------------------------------------------
  let visible = true;
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting && !document.hidden;
    },
    { threshold: 0.05 }
  ).observe(wrap);

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
  });

  // --- Loop ----------------------------------------------------------------
  const clock = new THREE.Clock();
  let elapsed = 0;

  function stepMotes(delta) {
    const attr = moteGeometry.attributes.position;
    const arr = attr.array;
    for (let i = 0; i < MOTES; i++) {
      const yi = i * 3 + 1;
      arr[yi] += speeds[i] * delta;
      // Respawn below once a mote drifts out of frame.
      if (arr[yi] > 1.8) {
        const radius = 1.1 + Math.random() * 1.5;
        const angle = Math.random() * Math.PI * 2;
        arr[i * 3] = Math.cos(angle) * radius;
        arr[yi] = -1.8;
        arr[i * 3 + 2] = Math.sin(angle) * radius;
      }
    }
    attr.needsUpdate = true;
  }

  if (!reduce) {
    (function step() {
      requestAnimationFrame(step);
      if (!visible) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;

      // The curse breathes: a slow, low-amplitude pulse.
      const pulse = 1 + Math.sin(elapsed * 0.9) * 0.12;
      coreUniforms.uTime.value = elapsed;
      coreUniforms.uPulse.value = pulse;
      glow.scale.setScalar(3.6 * pulse);

      // Rings drift at different rates for a layered, non-mechanical feel.
      ringOuter.rotation.z += delta * 0.12;
      ringMid.rotation.z -= delta * 0.19;
      ringInner.rotation.x += delta * 0.16;
      core.rotation.y += delta * 0.08;

      motes.rotation.y -= delta * 0.05;
      stepMotes(delta);

      group.rotation.x += (targetX - group.rotation.x) * 0.05;
      group.rotation.y += (targetY - group.rotation.y) * 0.05;
      core.rotation.x = group.rotation.x * 0.4;
      core.rotation.z = group.rotation.y * 0.4;

      renderer.render(scene, camera);
    })();
  } else {
    renderer.render(scene, camera);
  }

  canvas.classList.add('is-ready');
}

initShadowScene().catch(() => {});