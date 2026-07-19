/* ==========================================================================
   RV JEWELLS — IMMERSIVE 3D RING EXPERIENCE
   Three.js + GSAP + Lenis

   Architecture:
     1. Three.js scene (ring, glow, sweep, particles)
     2. Lenis smooth scrolling → feeds GSAP ScrollTrigger
     3. Single ScrollTrigger onUpdate → updateRingState(progress)
     4. Render loop applies ringState to Three.js objects
     5. Mouse tilt (hero only) + magnetic CTA
   ========================================================================== */

import * as THREE from 'https://esm.sh/three@0.160.0';
import { RoomEnvironment } from 'https://esm.sh/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'https://esm.sh/gsap@3.12.2';
import { ScrollTrigger } from 'https://esm.sh/gsap@3.12.2/ScrollTrigger';
import { Observer } from 'https://esm.sh/gsap@3.12.2/Observer';
import Lenis from 'https://esm.sh/lenis@1.0.29';

gsap.registerPlugin(ScrollTrigger, Observer);

/* ============================================================
   DOM Element Selections (declared early for use in functions)
   ============================================================ */
const sectionsOverlay = document.getElementById('sections-overlay');
const secEls = {};
['sec-hero','sec-purity','sec-craft','sec-tarnish','sec-detail','sec-collections','sec-luxury','sec-cta'].forEach(id => {
  secEls[id] = document.getElementById(id);
});

/* Each section visibility range: [start, end, fade-in duration, fade-out duration] */
const SEC_VIS = {
  'sec-hero':        [0,      0.125, 0.04, 0.03],
  'sec-purity':      [0.115,  0.245, 0.03, 0.03],
  'sec-craft':       [0.24,   0.365, 0.03, 0.03],
  'sec-tarnish':     [0.365,  0.49,  0.03, 0.03],
  'sec-detail':      [0.49,   0.615, 0.03, 0.03],
  'sec-collections': [0.615,  0.74,  0.03, 0.03],
  'sec-luxury':      [0.74,   0.865, 0.03, 0.03],
  'sec-cta':         [0.865,  1.0,   0.03, 0.01],
};

/* Track animation state per section */
const secAnimated = {};

/* ============================================================
   SECTION PROGRESS BOUNDARIES
   900vh scroll driver → end: 'bottom bottom' gives 800vh of travel
   8 sections × 100vh = 800vh
   Progress 0-1 maps across all 8 sections
   ============================================================ */
const SEC = {
  HERO:       [0,      0.125],
  PURITY:     [0.125,  0.25 ],
  CRAFT:      [0.25,   0.375],
  TARNISH:    [0.375,  0.5  ],
  DETAIL:     [0.5,    0.625],
  COLLECTION: [0.625,  0.75 ],
  LUXURY:     [0.75,   0.875],
  CTA:        [0.875,  1.0  ],
};

/* Helper: remap value from one range to another, clamped */
const remap = (v, a, b, c, d) => c + (d - c) * Math.max(0, Math.min(1, (v - a) / (b - a)));

/* Helper: smooth-step easing */
const smooth = t => t * t * (3 - 2 * t);

/* Helper: linear interpolate color components */
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
  const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

/* ============================================================
   THREE.JS SETUP
   ============================================================ */
const canvas = document.getElementById('three-canvas');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,            // transparent → body background shows through
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 6);

/* --- Environment map (RoomEnvironment for real metallic reflections) --- */
const pmremGen = new THREE.PMREMGenerator(renderer);
pmremGen.compileEquirectangularShader();
const roomEnv = pmremGen.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environment = roomEnv;
pmremGen.dispose();

/* ============================================================
   LIGHTING
   ============================================================ */
const ambientLight = new THREE.AmbientLight(0xF8F5EF, 0.5);
scene.add(ambientLight);

/* Key light — warm gold, moves with scroll */
const keyLight = new THREE.PointLight(0xFFD484, 5, 30);
keyLight.position.set(4, 3, 5);
scene.add(keyLight);

/* Fill light — cool ivory */
const fillLight = new THREE.PointLight(0xEEEEFF, 2.5, 25);
fillLight.position.set(-5, -3, 4);
scene.add(fillLight);

/* Rim light — champagne gold */
const rimLight = new THREE.PointLight(0xE8D8B5, 3.5, 25);
rimLight.position.set(0, 6, -3);
scene.add(rimLight);

/* Under light — depth */
const underLight = new THREE.PointLight(0xC8A55A, 1.5, 20);
underLight.position.set(0, -4, 2);
scene.add(underLight);

/* ============================================================
   RING GEOMETRY & MATERIAL
   ============================================================ */
const ringGeo = new THREE.TorusGeometry(
  1.8,   // tube radius (ring diameter / 2)
  0.265, // tube thickness
  128,   // radial segments (smooth cross-section)
  256    // tubular segments (smooth circle)
);

const ringMat = new THREE.MeshPhysicalMaterial({
  color:               new THREE.Color(0xC8A55A),
  metalness:           1.0,
  roughness:           0.07,
  envMapIntensity:     3.0,
  clearcoat:           1.0,
  clearcoatRoughness:  0.07,
  reflectivity:        1.0,
  /* iridescence creates subtle rainbow sheen visible in certain angles */
  iridescence:         0.2,
  iridescenceIOR:      1.5,
});

const ring = new THREE.Mesh(ringGeo, ringMat);
scene.add(ring);

/* --- Glow ring (same shape, slightly larger, additive blend) --- */
const glowGeo = new THREE.TorusGeometry(1.81, 0.28, 48, 128);
const glowMat = new THREE.MeshBasicMaterial({
  color:      0xC8A55A,
  transparent: true,
  opacity:     0.05,
  blending:   THREE.AdditiveBlending,
  depthWrite:  false,
  side:        THREE.BackSide,
});
const glowRing = new THREE.Mesh(glowGeo, glowMat);
scene.add(glowRing);

/* --- Three diamond-like octahedral gems on the band --- */
const gemMat = new THREE.MeshPhysicalMaterial({
  color:              0xFFFFFF,
  metalness:          0,
  roughness:          0,
  transmission:       0.94,
  transparent:        true,
  ior:                2.42,
  thickness:          0.12,
  clearcoat:          1.0,
  envMapIntensity:    5.0,
});

const gems = [];
const GEM_ANGLES = [Math.PI / 2, Math.PI / 2 + (Math.PI * 2) / 3, Math.PI / 2 + (Math.PI * 4) / 3];
GEM_ANGLES.forEach(angle => {
  const geo = new THREE.OctahedronGeometry(0.09, 0);
  const gem = new THREE.Mesh(geo, gemMat);
  gem.position.set(
    Math.cos(angle) * 1.8,
    Math.sin(angle) * 1.8,
    0
  );
  gem.rotation.z = angle + Math.PI / 4;
  scene.add(gem);
  gems.push({ mesh: gem, baseAngle: angle });
});

/* --- Reflection sweep arc --- */
const sweepGeo = new THREE.TorusGeometry(1.82, 0.27, 6, 64, Math.PI * 0.22);
const sweepMat = new THREE.MeshBasicMaterial({
  color:      0xFFF8E7,
  transparent: true,
  opacity:     0,
  blending:   THREE.AdditiveBlending,
  depthWrite:  false,
});
const sweepArc = new THREE.Mesh(sweepGeo, sweepMat);
scene.add(sweepArc);

/* ============================================================
   DUST PARTICLES (floating ambient dust)
   ============================================================ */
const DUST_COUNT = 380;
const dustPos = new Float32Array(DUST_COUNT * 3);
const dustVel = new Float32Array(DUST_COUNT * 3); // individual drift velocity

for (let i = 0; i < DUST_COUNT; i++) {
  dustPos[i * 3]     = (Math.random() - 0.5) * 14;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  dustVel[i * 3]     = (Math.random() - 0.5) * 0.001;
  dustVel[i * 3 + 1] = (Math.random() - 0.5) * 0.0008;
  dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.0006;
}

const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

const dustMat = new THREE.PointsMaterial({
  color:       0xC8A55A,
  size:        0.025,
  transparent: true,
  opacity:     0.30,
  sizeAttenuation: true,
  depthWrite:  false,
  blending:    THREE.AdditiveBlending,
});
const dustCloud = new THREE.Points(dustGeo, dustMat);
scene.add(dustCloud);

/* --- Sparkle particles on ring surface --- */
const SPARKLE_COUNT = 96;
const sparklePos = new Float32Array(SPARKLE_COUNT * 3);

for (let i = 0; i < SPARKLE_COUNT; i++) {
  const u = (i / SPARKLE_COUNT) * Math.PI * 2;
  const v = Math.random() * Math.PI * 2;
  const R = 1.8, r = 0.265;
  sparklePos[i * 3]     = (R + r * Math.cos(v)) * Math.cos(u);
  sparklePos[i * 3 + 1] = (R + r * Math.cos(v)) * Math.sin(u);
  sparklePos[i * 3 + 2] = r * Math.sin(v);
}

const sparkleGeo = new THREE.BufferGeometry();
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));

const sparkleMat = new THREE.PointsMaterial({
  color:       0xFFFFFF,
  size:        0.045,
  transparent: true,
  opacity:     0,
  sizeAttenuation: true,
  depthWrite:  false,
  blending:    THREE.AdditiveBlending,
});
const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
scene.add(sparkles);

/* ============================================================
   RING STATE — GSAP proxy object
   All Three.js updates in the render loop read from here.
   ============================================================ */
const RS = {
  rotX:          0,
  rotY:          0,
  rotZ:          0,
  posX:          0,
  posY:          0,
  scale:         1.0,
  cameraZ:       6.0,
  lightMul:      1.0,
  glowOpacity:   0.05,
};

/* ============================================================
   LENIS SMOOTH SCROLLING
   ============================================================ */
const lenis = new Lenis({
  duration:    1.6,
  easing:      t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 0.9,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ============================================================
   SCROLL TRIGGER — master driver
   ============================================================ */
let scrollProgress = 0;

ScrollTrigger.create({
  trigger: '#scroll-driver',
  start:   'top top',
  end:     'bottom bottom',
  scrub:   0,
  onUpdate(self) {
    scrollProgress = self.progress;
    updateRingState(self.progress);
    updateBackground(self.progress);
    updateSections(self.progress);
  },
});

/* ============================================================
   FADE OUT canvas + overlay when store content appears
   ============================================================ */
const expCanvas   = document.getElementById('three-canvas');
const expOverlay  = document.getElementById('sections-overlay');
const expProgress = document.getElementById('progress-bar');

ScrollTrigger.create({
  trigger:  '#store-content',
  start:    'top 95%',      // begins fading as store-content enters
  end:      'top 30%',      // fully hidden once well into store
  scrub:    1,
  onUpdate(self) {
    const fade = 1 - self.progress;
    if (expCanvas)   expCanvas.style.opacity   = fade;
    if (expOverlay)  expOverlay.style.opacity  = fade;
    if (expProgress) expProgress.style.opacity = fade;
    /* Restore ivory background once fully in store */
    if (self.progress >= 0.98) {
      document.body.style.backgroundColor = '#F8F5EF';
    }
  },
  onLeave() {
    /* Completely hide 3D layer so it doesn't intercept repaints */
    if (expCanvas)  expCanvas.style.display  = 'none';
    if (expOverlay) expOverlay.style.display = 'none';
  },
  onEnterBack() {
    /* Restore when scrolling back up into experience */
    if (expCanvas)  { expCanvas.style.display  = ''; expCanvas.style.opacity  = '1'; }
    if (expOverlay) { expOverlay.style.display = ''; expOverlay.style.opacity = '1'; }
  },
});

/* Keep nav transparent while inside the experience scroll zone */
ScrollTrigger.create({
  trigger: '#scroll-driver',
  start:   'top top',
  end:     'bottom bottom',
  onEnter()     { document.getElementById('header')?.classList.add('transparent'); },
  onLeave()     { document.getElementById('header')?.classList.remove('transparent'); },
  onEnterBack() { document.getElementById('header')?.classList.add('transparent'); },
  onLeaveBack() { document.getElementById('header')?.classList.remove('transparent'); },
});

/* ============================================================
   UPDATE: RING STATE (maps 0-1 progress to all 3D properties)
   ============================================================ */
function updateRingState(p) {

  /* --- Y rotation: continuous scroll-driven rotation --- */
  RS.rotY = remap(p, 0, 1, 0, Math.PI * 3.5);

  /* --- Scale --- */
  if      (p < SEC.PURITY[1])     RS.scale = remap(p, SEC.PURITY[0],     SEC.PURITY[1],     1.0,  1.18);
  else if (p < SEC.TARNISH[1])    RS.scale = 1.18;
  else if (p < SEC.DETAIL[1])     RS.scale = remap(p, SEC.DETAIL[0],     SEC.DETAIL[1],     1.18, 1.28);
  else if (p < SEC.COLLECTION[1]) RS.scale = remap(p, SEC.COLLECTION[0], SEC.COLLECTION[1], 1.28, 0.95);
  else if (p < SEC.LUXURY[1])     RS.scale = remap(p, SEC.LUXURY[0],     SEC.LUXURY[1],     0.95, 2.6);
  else                             RS.scale = remap(p, SEC.CTA[0],        SEC.CTA[1],        2.6,  1.15);

  /* --- X Position (section 2: ring shifts left, section 3: returns center) --- */
  if      (p < SEC.CRAFT[0])   RS.posX = 0;
  else if (p < SEC.CRAFT[1])   RS.posX = remap(p, SEC.CRAFT[0],   SEC.CRAFT[1],   0,    -2.8);
  else if (p < SEC.TARNISH[1]) RS.posX = remap(p, SEC.TARNISH[0], SEC.TARNISH[1], -2.8, 0);
  else                          RS.posX = 0;

  /* --- Y Position (section 5: ring lifts upward) --- */
  if      (p < SEC.COLLECTION[0]) RS.posY = 0;
  else if (p < SEC.COLLECTION[1]) RS.posY = remap(p, SEC.COLLECTION[0], SEC.COLLECTION[1], 0,   1.9);
  else if (p < SEC.LUXURY[1])     RS.posY = remap(p, SEC.LUXURY[0],     SEC.LUXURY[1],     1.9, 0);
  else                             RS.posY = 0;

  /* --- Z rotation (section 2: ring tilts 22.5°) --- */
  if      (p < SEC.CRAFT[0])   RS.rotZ = 0;
  else if (p < SEC.CRAFT[1])   RS.rotZ = remap(p, SEC.CRAFT[0],   SEC.CRAFT[1],   0,         Math.PI / 8);
  else if (p < SEC.TARNISH[1]) RS.rotZ = remap(p, SEC.TARNISH[0], SEC.TARNISH[1], Math.PI/8, 0);
  else                          RS.rotZ = 0;

  /* --- X rotation (section 3: tilt to show inside face; section 4: straighten) --- */
  if      (p < SEC.TARNISH[0]) RS.rotX = 0;
  else if (p < SEC.TARNISH[1]) RS.rotX = remap(p, SEC.TARNISH[0], SEC.TARNISH[1], 0,          Math.PI / 2.3);
  else if (p < SEC.DETAIL[1])  RS.rotX = remap(p, SEC.DETAIL[0],  SEC.DETAIL[1],  Math.PI/2.3, 0);
  else                          RS.rotX = 0;

  /* --- Camera Z (section 4: macro zoom; section 5: zoom back out) --- */
  if      (p < SEC.DETAIL[0])      RS.cameraZ = 6;
  else if (p < SEC.DETAIL[1])      RS.cameraZ = remap(p, SEC.DETAIL[0],     SEC.DETAIL[1],     6, 3.0);
  else if (p < SEC.COLLECTION[1])  RS.cameraZ = remap(p, SEC.COLLECTION[0], SEC.COLLECTION[1], 3, 6);
  else                              RS.cameraZ = 6;

  /* --- Light multiplier (section 6: dramatic increase) --- */
  if      (p < SEC.LUXURY[0]) RS.lightMul = 1.0;
  else if (p < SEC.LUXURY[1]) RS.lightMul = remap(p, SEC.LUXURY[0], SEC.LUXURY[1], 1.0, 2.8);
  else                         RS.lightMul = remap(p, SEC.CTA[0],    SEC.CTA[1],    2.8, 1.0);
}

/* ============================================================
   UPDATE: BACKGROUND COLOR
   ============================================================ */
function updateBackground(p) {
  const C = {
    ivory:    '#F8F5EF',
    champagne:'#E8D8B5',
    beige:    '#EDE6DA',
    dark:     '#1A1510',
  };

  let color;
  if      (p < SEC.TARNISH[0])    color = C.ivory;
  else if (p < SEC.TARNISH[1])    color = lerpHex(C.ivory,    C.champagne, smooth(remap(p, SEC.TARNISH[0],    SEC.TARNISH[1],    0, 1)));
  else if (p < SEC.DETAIL[0])     color = lerpHex(C.champagne, C.beige,    smooth(remap(p, SEC.TARNISH[1],    SEC.DETAIL[0],     0, 1)));
  else if (p < SEC.COLLECTION[1]) color = C.beige;
  else if (p < SEC.LUXURY[0])     color = lerpHex(C.beige,    C.dark,      smooth(remap(p, SEC.COLLECTION[1], SEC.LUXURY[0],     0, 1)));
  else if (p < SEC.LUXURY[1])     color = lerpHex(C.beige,    C.dark,      smooth(remap(p, SEC.LUXURY[0],     SEC.LUXURY[1],     0, 1)));
  else                             color = lerpHex(C.dark,     C.ivory,     smooth(remap(p, SEC.CTA[0],        SEC.CTA[1],        0, 1)));

  document.body.style.backgroundColor = color;

  /* Flip text color in luxury section */
  const isLight = p < SEC.LUXURY[0] || p > SEC.CTA[0];
  if (sectionsOverlay) {
    sectionsOverlay.style.color = isLight ? '' : '#E8D8B5';
  }
}

/* ============================================================
   UPDATE: SECTION VISIBILITY & ANIMATIONS
   ============================================================ */

function updateSections(p) {
  for (const [id, [start, end, fadeIn, fadeOut]] of Object.entries(SEC_VIS)) {
    const el = secEls[id];
    if (!el) continue;

    let opacity = 0;
    if (p >= start && p < start + fadeIn) {
      opacity = smooth((p - start) / fadeIn);
    } else if (p >= start + fadeIn && p < end - fadeOut) {
      opacity = 1;
    } else if (p >= end - fadeOut && p <= end) {
      opacity = 1 - smooth((p - (end - fadeOut)) / fadeOut);
    }

    el.style.opacity = opacity;

    /* Trigger per-section entry animations once, at 50% visible */
    if (opacity >= 0.5 && !secAnimated[id]) {
      secAnimated[id] = true;
      triggerSectionAnim(id, el);
    }
  }

  /* Update progress bar */
  const pb = document.getElementById('progress-bar');
  if (pb) pb.style.width = `${p * 100}%`;

  /* Update orbit container position to track ring */
  updateOrbitPosition();
}

/* ============================================================
   SECTION ENTRY ANIMATIONS
   ============================================================ */
function triggerSectionAnim(id, el) {
  const fromLeft  = el.querySelectorAll('.animate-from-left');
  const fromRight = el.querySelectorAll('.animate-from-right');
  const fadeUp    = el.querySelectorAll('.animate-fade-up');

  if (fromLeft.length)  gsap.to(fromLeft,  { x: 0, opacity: 1, duration: 1.2, stagger: 0.12, ease: 'power3.out' });
  if (fromRight.length) gsap.to(fromRight, { x: 0, opacity: 1, duration: 1.2, stagger: 0.12, ease: 'power3.out' });
  if (fadeUp.length)    gsap.to(fadeUp,    { y: 0, opacity: 1, duration: 1.2, stagger: 0.1,  ease: 'power3.out' });

  /* Detail markers appear */
  if (id === 'sec-detail') {
    const markers = el.querySelectorAll('.d-marker');
    gsap.to(markers, { opacity: 1, duration: 0.6, stagger: 0.25, delay: 0.4, ease: 'power2.out' });
  }

  /* Luxury words stagger in */
  if (id === 'sec-luxury') {
    const words = el.querySelectorAll('.lux-word');
    const sub   = el.querySelector('.luxury-sub');
    gsap.to(words, { opacity: 1, y: 0, duration: 0.9, stagger: 0.22, ease: 'power3.out' });
    if (sub) gsap.to(sub, { opacity: 0.8, duration: 0.8, delay: 0.8, ease: 'power2.out' });
  }

  /* Orbit items fly out from center */
  if (id === 'sec-collections') {
    const positions = [
      { x: -230, y: -180 }, // necklace top-left
      { x:  230, y: -180 }, // ring top-right
      { x:  230, y:  150 }, // earrings bottom-right
      { x: -230, y:  150 }, // bracelet bottom-left
    ];
    const items = el.querySelectorAll('.orbit-item');
    items.forEach((item, i) => {
      gsap.to(item, {
        x: positions[i].x,
        y: positions[i].y,
        opacity: 1,
        scale: 1,
        duration: 1.0,
        delay: i * 0.12,
        ease: 'power3.out',
      });
    });
  }
}

/* ============================================================
   ORBIT CONTAINER — tracks ring's projected screen position
   ============================================================ */
const orbitContainer = document.getElementById('orbit-container');
const _tempVec = new THREE.Vector3();

function updateOrbitPosition() {
  if (!orbitContainer) return;
  _tempVec.set(RS.posX, RS.posY, 0);
  _tempVec.project(camera);

  const sx = (_tempVec.x + 1) * 0.5 * window.innerWidth;
  const sy = (-_tempVec.y + 1) * 0.5 * window.innerHeight;

  orbitContainer.style.left = `${sx}px`;
  orbitContainer.style.top  = `${sy}px`;
}

/* ============================================================
   REFLECTION SWEEP ANIMATION (repeating, randomized interval)
   ============================================================ */
function triggerSweep() {
  const randomDelay = 2.5 + Math.random() * 5; // 2.5s – 7.5s gap
  const randomAngle = Math.random() * Math.PI * 2;

  gsap.delayedCall(randomDelay, () => {
    sweepArc.rotation.z = randomAngle;

    gsap.timeline({
      onComplete: triggerSweep,
    })
    .to(sweepMat, { opacity: 0.7, duration: 0.25, ease: 'power2.in' })
    .to(sweepMat, { opacity: 0,   duration: 0.9,  ease: 'power2.out' });
  });
}
triggerSweep();

/* ============================================================
   MOUSE INTERACTION
   ============================================================ */
let targetMouseX = 0, targetMouseY = 0;
let smoothMouseX = 0, smoothMouseY = 0;

window.addEventListener('mousemove', e => {
  /* Fade mouse tilt out as user scrolls past the hero */
  const heroFade = Math.max(0, 1 - scrollProgress / 0.12);
  targetMouseX = ((e.clientY / window.innerHeight) - 0.5) * -2 * heroFade;
  targetMouseY = ((e.clientX / window.innerWidth)  - 0.5) *  2 * heroFade;
});

/* Magnetic CTA button */
const magneticBtn = document.getElementById('magnetic-cta');
if (magneticBtn) {
  magneticBtn.addEventListener('mousemove', e => {
    const rect = magneticBtn.getBoundingClientRect();
    const cx   = rect.left + rect.width / 2;
    const cy   = rect.top  + rect.height / 2;
    gsap.to(magneticBtn, {
      x:        (e.clientX - cx) * 0.35,
      y:        (e.clientY - cy) * 0.35,
      duration: 0.35,
      ease:     'power2.out',
    });
  });

  magneticBtn.addEventListener('mouseleave', () => {
    gsap.to(magneticBtn, {
      x:        0,
      y:        0,
      duration: 1.0,
      ease:     'elastic.out(1, 0.45)',
    });
  });
}

/* ============================================================
   LOADING: ring drops in on page load
   (index.html's own loader handles the brand loading screen)
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  /* Hero brand mark and scroll hint appear after a brief delay */
  setTimeout(() => {
    document.querySelector('.hero-brand')?.classList.add('visible');
    document.querySelector('.scroll-hint')?.classList.add('visible');
  }, 800);
});

/* ============================================================
   THREE.JS RENDER LOOP
   ============================================================ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  /* ---- Smooth mouse tilt ---- */
  smoothMouseX += (targetMouseX - smoothMouseX) * 0.05;
  smoothMouseY += (targetMouseY - smoothMouseY) * 0.05;

  /* ---- Idle oscillation offset ---- */
  const idleY = Math.sin(elapsed * 0.75) * 0.035; // ±2°
  const idleX = Math.cos(elapsed * 0.55) * 0.018; // ±1°

  /* ---- Apply to ring mesh ---- */
  ring.rotation.y = RS.rotY + idleY + smoothMouseY * 0.14;
  ring.rotation.x = RS.rotX + idleX + smoothMouseX * 0.14;
  ring.rotation.z = RS.rotZ;
  ring.position.x = RS.posX;
  ring.position.y = RS.posY + Math.sin(elapsed * 0.45) * 0.04; // subtle float
  ring.scale.setScalar(RS.scale);

  /* ---- Glow ring mirrors ring ---- */
  glowRing.rotation.copy(ring.rotation);
  glowRing.position.copy(ring.position);
  glowRing.scale.copy(ring.scale);

  /* ---- Sweep arc mirrors ring rotation ---- */
  sweepArc.rotation.x = ring.rotation.x;
  sweepArc.rotation.y = ring.rotation.y;
  sweepArc.position.copy(ring.position);
  sweepArc.scale.copy(ring.scale);

  /* ---- Gems orbit with ring ---- */
  gems.forEach(({ mesh, baseAngle }) => {
    const angle = baseAngle + ring.rotation.y;
    mesh.position.set(
      (Math.cos(angle) * 1.8 + RS.posX) * RS.scale,
      (Math.sin(angle) * 1.8 + RS.posY) * RS.scale,
      0
    );
    mesh.scale.setScalar(RS.scale);
  });

  /* ---- Diamond sparkles: fire at reflection angles ---- */
  const normalizedRotY = ((ring.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const atReflection = (normalizedRotY > Math.PI * 0.42 && normalizedRotY < Math.PI * 0.58)
                    || (normalizedRotY > Math.PI * 1.42 && normalizedRotY < Math.PI * 1.58);
  const targetSparkleOp = atReflection ? 0.85 : 0;
  sparkleMat.opacity += (targetSparkleOp - sparkleMat.opacity) * 0.12;

  /* ---- Dust particles drift ---- */
  const dPos = dustGeo.attributes.position;
  for (let i = 0; i < DUST_COUNT; i++) {
    dPos.setXYZ(
      i,
      dPos.getX(i) + dustVel[i * 3],
      dPos.getY(i) + dustVel[i * 3 + 1] + Math.sin(elapsed * 0.3 + i * 0.1) * 0.0006,
      dPos.getZ(i) + dustVel[i * 3 + 2]
    );

    /* Wrap particles so they don't drift away */
    if (Math.abs(dPos.getX(i)) > 7) dustVel[i * 3]     *= -1;
    if (Math.abs(dPos.getY(i)) > 5) dustVel[i * 3 + 1] *= -1;
    if (Math.abs(dPos.getZ(i)) > 4) dustVel[i * 3 + 2] *= -1;
  }
  dPos.needsUpdate = true;

  /* ---- Sparkle positions follow ring in world space ---- */
  const sPos = sparkleGeo.attributes.position;
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const u = (i / SPARKLE_COUNT) * Math.PI * 2;
    const v = Math.random() * 0.1; // jitter per frame for shimmer
    const R = 1.8 * RS.scale, r = 0.265 * RS.scale;
    sPos.setXYZ(
      i,
      (R + r * Math.cos(v)) * Math.cos(u + ring.rotation.y) + RS.posX,
      (R + r * Math.cos(v)) * Math.sin(u + ring.rotation.y) + RS.posY + Math.sin(elapsed * 0.45) * 0.04,
      r * Math.sin(v)
    );
  }
  sPos.needsUpdate = true;

  /* ---- Lights orbit based on scroll ---- */
  const lightAngle = elapsed * 0.25 + scrollProgress * Math.PI;
  keyLight.position.x = Math.cos(lightAngle) * 4;
  keyLight.position.z = Math.sin(lightAngle) * 4 + 2;
  keyLight.intensity  = 5 * RS.lightMul;
  rimLight.intensity  = 3.5 * RS.lightMul;

  /* ---- Camera ---- */
  camera.position.z = RS.cameraZ;

  renderer.render(scene, camera);
}

/* ============================================================
   RESIZE HANDLER
   ============================================================ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/* ============================================================
   HERO: SUBTLE INTRO FLOAT FOR RING (runs on load)
   Ring drops from above on page-load.
   ============================================================ */
ring.position.y = -3;
ring.scale.setScalar(0);

gsap.timeline({ delay: 0.4 })
  .to(ring.position, { y: 0, duration: 2.0, ease: 'power3.out' })
  .to(ring.scale,    { x: 1, y: 1, z: 1, duration: 2.0, ease: 'expo.out' }, '<');

/* ============================================================
   KICK OFF RENDER LOOP
   ============================================================ */
animate();
