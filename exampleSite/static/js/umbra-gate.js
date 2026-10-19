/*
 * "Umbra Gate" hero scene for the example site.
 *
 * A procedural shadow portal: a swirling iris behind a writhing ring, with
 * motes streaming inward and being consumed by the centre.
 *
 * Interaction:
 * - Drag to rotate the portal.
 * - Scroll (wheel) over the canvas to dolly the camera in and out.
 *   Scrolling is only captured while the pointer is actually inside the
 *   canvas box, and never when Ctrl/Meta is held, so the page still
 *   scrolls normally everywhere else.
 *
 * Design notes:
 * - Depends only on the "three" bare specifier from the theme's importmap.
 * - Bails out early on mobile, data-saver, missing WebGL, or failed import.
 * - Honours prefers-reduced-motion with a single static frame.
 * - Pauses the render loop when scrolled out of view or the tab is hidden.
 */

async function initPortalScene() {
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
  camera.position.set(0, 0.15, 5.6);

  // Dolly bounds for scroll zoom.
  const Z_MIN = 2.7;
  const Z_MAX = 7.4;
  let targetZ = camera.position.z;

  // --- Palette -------------------------------------------------------------
  // The iris centre stays near-black so the gate reads as a hole rather than
  // a lamp; brightness lives in the spiral arms and the rim.
  const PALETTE = {
    light: {
      irisCore: 0x07030c,
      irisArm: 0x8f2fd4,
      irisEdge: 0xd9a6ff,
      ring: 0x1a0a26,
      ringEdge: 0x6d2f9c,
      spark: 0x6b2ba0,
      glow: 0.18,
      moteOpacity: 0.8
    },
    dark: {
      irisCore: 0x0d0416,
      irisArm: 0xb25cff,
      irisEdge: 0xf0d6ff,
      ring: 0x120722,
      ringEdge: 0x9b5fd6,
      spark: 0x8b45c4,
      glow: 0.38,
      moteOpacity: 0.9
    }
  };

  const isDark = () => {
    const sheet = document.getElementById('dark-theme');
    return sheet ? !sheet.disabled : false;
  };

  const portal = new THREE.Group();
  scene.add(portal);

  // --- The iris ------------------------------------------------------------
  // Polar-space swirl: rotating spiral arms over a radial falloff. This is
  // what sells the "portal" read more than any amount of ring geometry.
  const irisUniforms = {
    uTime: { value: 0 },
    uCore: { value: new THREE.Color(PALETTE.light.irisCore) },
    uArm: { value: new THREE.Color(PALETTE.light.irisArm) },
    uEdge: { value: new THREE.Color(PALETTE.light.irisEdge) },
    uArms: { value: 7.0 },
    uSpin: { value: 1.0 }
  };

  const irisMaterial = new THREE.ShaderMaterial({
    uniforms: irisUniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uArms;
      uniform float uSpin;
      uniform vec3 uCore;
      uniform vec3 uArm;
      uniform vec3 uEdge;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float a = atan(p.y, p.x);

        // Spiral arms: angular frequency coupled to radius, so they wind in.
        // Squaring the smoothstep keeps them as thin filaments instead of
        // broad blobs.
        float spiral = sin(a * uArms - uTime * uSpin * 1.7 + r * 8.5);
        float arms = pow(smoothstep(0.05, 1.0, spiral), 2.4);

        // Counter-rotating fine detail for depth.
        float filigree = sin(a * 17.0 + uTime * uSpin * 1.1 - r * 18.0) * 0.5 + 0.5;

        // Event-horizon falloff toward the centre.
        float core = exp(-r * 3.4);
        float rim = smoothstep(0.70, 1.0, r);

        // Body stays near-black; only the filaments and the outer rim carry
        // colour, so the gate reads as a hole rather than a lamp.
        vec3 col = uCore;
        col = mix(col, uArm, arms * 0.95);
        col = mix(col, uEdge, rim * 0.5 + filigree * rim * 0.3);
        col += uArm * core * 0.15 * (0.5 + 0.5 * filigree);

        // Near-opaque throughout: the void must not let the page bleed
        // through and turn the interior milky. Colour, not alpha, carries
        // the filaments.
        float alpha = smoothstep(1.0, 0.80, r) * (0.94 + 0.06 * arms);
        alpha = clamp(alpha, 0.0, 1.0);

        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const iris = new THREE.Mesh(new THREE.CircleGeometry(1.28, 128), irisMaterial);
  portal.add(iris);

  // --- The writhing rim ----------------------------------------------------
  // A torus whose vertices are pushed along their normals by layered sine
  // waves, so the silhouette writhes like torn shadow rather than sitting
  // there as a clean circle.
  const ringUniforms = {
    uTime: { value: 0 },
    uBody: { value: new THREE.Color(PALETTE.light.ring) },
    uEdge: { value: new THREE.Color(PALETTE.light.ringEdge) }
  };

  const ringMaterial = new THREE.ShaderMaterial({
    uniforms: ringUniforms,
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float w = sin(uv.x * 44.0 + uTime * 2.2) * 0.6
                + sin(uv.x * 23.0 - uTime * 1.4) * 0.4;
        p += normal * w * 0.035;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uBody;
      uniform vec3 uEdge;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        // Light the tube's own edges (v runs around the tube circumference)
        // so the ring reads as a band of shadow with lit inner/outer lips
        // rather than a flat black donut.
        float e = min(vUv.y, 1.0 - vUv.y) * 2.0;
        float lip = 1.0 - smoothstep(0.0, 0.65, e);
        float fres = pow(1.0 - abs(vNormal.z), 2.0);

        vec3 col = mix(uBody, uEdge, clamp(lip * 0.9 + fres * 0.35, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.048, 24, 220), ringMaterial);
  portal.add(rim);

  // Two thinner counter-rotating arcs outside the rim for depth.
  function makeArc(radius, tube, tilt, spin) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 16, 180, Math.PI * 1.45),
      new THREE.MeshBasicMaterial({ color: PALETTE.light.ringEdge, transparent: true, opacity: 0.55 })
    );
    mesh.rotation.x = tilt;
    mesh.userData.spin = spin;
    portal.add(mesh);
    return mesh;
  }

  const arcOuter = makeArc(1.72, 0.012, Math.PI / 2.6, 0.22);
  const arcInner = makeArc(1.55, 0.016, -Math.PI / 3.4, -0.31);

  // --- Inflowing motes -----------------------------------------------------
  // Sparks spiral inward and fade as the gate consumes them.
  const COUNT = 420;
  const pos = new Float32Array(COUNT * 3);
  const size = new Float32Array(COUNT);
  const alpha = new Float32Array(COUNT);
  const radius = new Float32Array(COUNT);
  const angle = new Float32Array(COUNT);
  const spin = new Float32Array(COUNT);
  const rate = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    radius[i] = 2.1 + Math.random() * 1.4;
    angle[i] = Math.random() * Math.PI * 2;
    spin[i] = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.45);
    rate[i] = 0.16 + Math.random() * 0.3;
    size[i] = 1.2 + Math.random() * 3.4;
    alpha[i] = 0;
    writeMote(i);
  }

  function writeMote(i) {
    const x = Math.cos(angle[i]) * radius[i];
    const y = Math.sin(angle[i]) * radius[i] * 0.92;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
  }

  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  moteGeometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  moteGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));

  const moteUniforms = {
    uColor: { value: new THREE.Color(PALETTE.light.spark) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
  };

  const moteMaterial = new THREE.ShaderMaterial({
    uniforms: moteUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (5.6 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        // Soft core with a tight bright centre.
        float soft = smoothstep(0.5, 0.0, d);
        float hot = smoothstep(0.22, 0.0, d);
        gl_FragColor = vec4(uColor, (soft * 0.55 + hot * 0.85) * vAlpha);
      }
    `
  });

  const motes = new THREE.Points(moteGeometry, moteMaterial);
  scene.add(motes);

  // --- Glow ----------------------------------------------------------------
  function makeGlowTexture(hex) {
    const size = 256;
    const canvas2 = document.createElement('canvas');
    canvas2.width = canvas2.height = size;
    const ctx = canvas2.getContext('2d');
    const c = new THREE.Color(hex);
    const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, `rgba(${rgb},0.5)`);
    grad.addColorStop(0.34, `rgba(${rgb},0.2)`);
    grad.addColorStop(0.66, `rgba(${rgb},0.05)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const glowMaterial = new THREE.SpriteMaterial({
    map: makeGlowTexture(PALETTE.light.irisArm),
    transparent: true,
    opacity: PALETTE.light.glow,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false
  });

  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.setScalar(3.4);
  glow.renderOrder = -1;
  scene.add(glow);

  // --- Theme adaptation ----------------------------------------------------
  function applyTheme() {
    const p = isDark() ? PALETTE.dark : PALETTE.light;
    irisUniforms.uCore.value.setHex(p.irisCore);
    irisUniforms.uArm.value.setHex(p.irisArm);
    irisUniforms.uEdge.value.setHex(p.irisEdge);
    ringUniforms.uBody.value.setHex(p.ring);
    ringUniforms.uEdge.value.setHex(p.ringEdge);
    arcOuter.material.color.setHex(p.ringEdge);
    arcInner.material.color.setHex(p.ringEdge);
    moteUniforms.uColor.value.setHex(p.spark);
    glowMaterial.map = makeGlowTexture(p.irisArm);
    glowMaterial.needsUpdate = true;
    glowMaterial.opacity = p.glow;
    moteMaterial.opacity = p.moteOpacity;
  }
  applyTheme();

  document.querySelectorAll('.dark-theme-toggle').forEach((el) => {
    el.addEventListener('click', () => setTimeout(applyTheme, 20));
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

  // --- Interaction: drag to rotate ----------------------------------------
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let rotX = 0.12;
  let rotY = -0.35;
  let autoSpin = true;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    autoSpin = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.006;
    rotX += (e.clientY - lastY) * 0.006;
    rotX = Math.max(-0.9, Math.min(0.9, rotX));
    lastX = e.clientX;
    lastY = e.clientY;
  });

  const endDrag = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // --- Interaction: scroll to zoom ----------------------------------------
  // Only hijack the wheel while the pointer is inside the canvas box, so the
  // rest of the page keeps scrolling normally. Ctrl/Meta+wheel is left alone
  // because that is browser zoom.
  let hovering = false;
  wrap.addEventListener('pointerenter', () => { hovering = true; });
  wrap.addEventListener('pointerleave', () => { hovering = false; });

  wrap.addEventListener(
    'wheel',
    (e) => {
      if (!hovering) return;
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      targetZ = Math.max(Z_MIN, Math.min(Z_MAX, targetZ + step * 0.0022));
    },
    { passive: false }
  );

  // Keyboard fallback for the same control, so zoom isn't mouse-only.
  canvas.setAttribute('tabindex', '0');
  canvas.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') targetZ = Math.max(Z_MIN, targetZ - 0.4);
    else if (e.key === '-' || e.key === '_') targetZ = Math.min(Z_MAX, targetZ + 0.4);
    else return;
    e.preventDefault();
  });

  // --- Hint ----------------------------------------------------------------
  const hint = document.createElement('p');
  hint.className = 'portal-hint';
  hint.textContent = 'Drag to rotate · Scroll to zoom';
  wrap.appendChild(hint);

  // --- Render gating -------------------------------------------------------
  let visible = true;
  new IntersectionObserver(
    (entries) => { visible = entries[0].isIntersecting && !document.hidden; },
    { threshold: 0.05 }
  ).observe(wrap);

  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  // --- Loop ----------------------------------------------------------------
  const clock = new THREE.Clock();
  let elapsed = 0;

  function stepMotes(delta) {
    const aAttr = moteGeometry.attributes.aAlpha;
    const aArr = aAttr.array;
    let dirty = false;

    for (let i = 0; i < COUNT; i++) {
      radius[i] -= rate[i] * delta;
      // Spiral in as they fall toward the gate.
      angle[i] += spin[i] * delta * (1.4 / Math.max(radius[i], 0.35));

      if (radius[i] < 0.18) {
        radius[i] = 2.1 + Math.random() * 1.4;
        angle[i] = Math.random() * Math.PI * 2;
        spin[i] = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.45);
        rate[i] = 0.16 + Math.random() * 0.3;
        aArr[i] = 0;
        writeMote(i);
        dirty = true;
        continue;
      }

      // Fade in from the rim, fade out into the event horizon.
      const t = (radius[i] - 0.18) / 3.5;
      aArr[i] = Math.min(1, (1 - t) * 1.4) * Math.min(1, t * 4);
      writeMote(i);
      dirty = true;
    }

    if (dirty) {
      moteGeometry.attributes.position.needsUpdate = true;
      aAttr.needsUpdate = true;
    }
  }

  if (!reduce) {
    (function step() {
      requestAnimationFrame(step);
      if (!visible) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;

      irisUniforms.uTime.value = elapsed;
      ringUniforms.uTime.value = elapsed;

      // The gate inhales slowly.
      const breath = 1 + Math.sin(elapsed * 0.75) * 0.05;
      iris.scale.setScalar(breath);
      glow.scale.setScalar(3.4 * breath);

      if (autoSpin) rotY += delta * 0.12;
      portal.rotation.x += (rotX - portal.rotation.x) * 0.08;
      portal.rotation.y += (rotY - portal.rotation.y) * 0.08;
      portal.rotation.z += delta * 0.05;

      arcOuter.rotation.z += delta * arcOuter.userData.spin;
      arcInner.rotation.z += delta * arcInner.userData.spin;

      camera.position.z += (targetZ - camera.position.z) * 0.12;

      stepMotes(delta);
      renderer.render(scene, camera);
    })();
  } else {
    camera.position.z = targetZ;
    renderer.render(scene, camera);
  }

  canvas.classList.add('is-ready');
}

initPortalScene().catch(() => {});