'use strict';

const ROOMS = {
  all: {
    n: 'Общ изглед',
    d: 'Комплексът е строен в края на II и началото на III в. и е бил обществен център на града – за баня, спорт, срещи и търговия.',
    c: [-63, 49, 66],
    t: [0, 3, 0],
    r: 'Днес са оцелели основите и части от зидовете. Руините са най-голямата антична сграда, видима в днешна Варна.'
  },
  pal: {
    n: 'Палестра',
    d: 'Открит двор с колонади за гимнастика, борба и разговори преди банята.',
    c: [-42, 20, 27],
    t: [-25, 3, 0],
    r: 'От двора са останали основи и разпилени колонни барабани.'
  },
  frig: {
    n: 'Фригидариум',
    d: 'Неотопляема зала със студен басейн за охлаждане след горещите помещения.',
    c: [-23, 22, 29],
    t: [-6.5, 3, 0],
    r: 'Подът и стените са силно разрушени; личи само планът на залата.'
  },
  tep: {
    n: 'Тепидариум',
    d: 'Умерено топла преходна зала – подготвя тялото за горещата баня.',
    c: [-2, 19, 25],
    t: [8, 3, 0],
    r: 'Запазени са части от преградните зидове.'
  },
  cal: {
    n: 'Калдариум',
    d: 'Най-топлата зала с басейни с гореща вода и пара, отопляна от хипокауст.',
    c: [13, 24, 31],
    t: [24.5, 3, 0],
    r: 'Видими са тухлените колонки (pilae) на подподовото отопление.'
  }
};

const FLOOR = 1.6, KEYS = Object.keys(ROOMS), cache = new Map();
let quality = window.innerWidth < 700 ? 'low' : 'high', last = 0;

function fail(message) {
  const e = document.getElementById('error');
  if (e) {
    e.textContent = message;
    e.hidden = false;
  }
}

function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(kind, mode) {
  const size = 512, c = document.createElement('canvas');
  c.width = c.height = size;
  const q = c.getContext('2d'), r = random(31);
  q.fillStyle = mode === 'rough' ? '#ddd' : mode === 'bump' ? '#999' : ({
    stone: '#c5b699',
    brick: '#b4a083',
    plaster: '#ded0ad',
    marble: '#ddd9c8',
    terra: '#a76140',
    mosaic: '#cabb9d',
    earth: '#9d9a77'
  })[kind];
  q.fillRect(0, 0, size, size);

  if (['stone', 'brick', 'terra', 'mosaic'].includes(kind)) {
    const rows = kind === 'mosaic' ? 32 : kind === 'terra' ? 12 : 8;
    const h = size / rows, w = kind === 'mosaic' ? 16 : kind === 'terra' ? 64 : 128;
    for (let y = 0; y < rows; y++) {
      for (let x = -1; x <= size / w; x++) {
        let band = kind === 'brick' && (y % 8 === 5 || y % 8 === 6), v = r();
        q.fillStyle = mode === 'bump'
          ? `rgb(${150 + v * 45},${150 + v * 45},${150 + v * 45})`
          : mode === 'rough'
          ? `rgb(${180 + v * 50},${180 + v * 50},${180 + v * 50})`
          : kind === 'mosaic'
          ? ((x + y) % 7 === 0 ? '#6c7264' : `hsl(39,24%,${59 + v * 17}%)`)
          : band
          ? `hsl(18,39%,${44 + v * 10}%)`
          : `hsl(${kind === 'terra' ? 18 : 38},${kind === 'terra' ? 43 : 20}%,${kind === 'terra' ? 43 + v * 12 : 57 + v * 17}%)`;
        q.fillRect(x * w + (y % 2) * w / 2 + 2, y * h + 2, w - 4, h - 4);
      }
    }
  }

  if (kind === 'plaster' || kind === 'earth') {
    for (let i = 0; i < 140; i++) {
      const x = r() * 512, y = r() * 512, rad = 8 + r() * 44;
      const stain = q.createRadialGradient(x, y, 0, x, y, rad);
      stain.addColorStop(0, mode === 'color' ? 'rgba(89,74,42,.045)' : 'rgba(0,0,0,.025)');
      stain.addColorStop(1, 'rgba(0,0,0,0)');
      q.fillStyle = stain;
      q.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }

  if (kind === 'marble') {
    q.lineWidth = mode === 'bump' ? 0.3 : 1;
    for (let j = -10; j < 24; j++) {
      q.strokeStyle = mode === 'rough' ? '#aaa' : mode === 'bump' ? '#999' : '#a6aa9b55';
      q.beginPath();
      for (let x = 0; x <= 512; x += 4) {
        let y = j * 32 + x * 0.6 + Math.sin(x * 0.025 + j) * 9;
        q.lineTo(x, y);
      }
      q.stroke();
    }
  }

  for (let i = 0; i < 21000; i++) {
    let v = r();
    q.fillStyle = v > 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(15,13,8,.045)';
    q.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (mode === 'color') t.encoding = THREE.sRGBEncoding;
  return t;
}

function material(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const m = new THREE.MeshStandardMaterial({
    map: canvasTexture(kind, 'color'),
    bumpMap: canvasTexture(kind, 'bump'),
    roughnessMap: canvasTexture(kind, 'rough'),
    bumpScale: kind === 'marble' ? 0.008 : 0.065,
    roughness: kind === 'marble' ? 0.48 : 0.94,
    metalness: 0
  });
  cache.set(kind, m);
  return m;
}

function metricUV(g, scale = 4) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    let nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    uv[i * 2] = (nx > ny && nx > nz ? p.getZ(i) : p.getX(i)) / scale;
    uv[i * 2 + 1] = (ny > nx && ny > nz ? p.getZ(i) : p.getY(i)) / scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function geometry(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

function mesh(parent, g, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}

function box(parent, w, h, d, x, y, z, m) {
  return mesh(parent, geometry(`box${w},${h},${d}`, () => metricUV(new THREE.BoxGeometry(w, h, d))), m, x, y, z);
}

function extrude(shape, depth) {
  return metricUV(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 }));
}

function archShape(radius, thickness) {
  const s = new THREE.Shape();
  s.moveTo(radius, 0);
  s.absarc(0, 0, radius, 0, Math.PI, false);
  s.lineTo(-radius - thickness, 0);
  s.absarc(0, 0, radius + thickness, Math.PI, 0, true);
  s.closePath();
  return s;
}

function buildArch(parent, r, t, depth, x, y, z, m) {
  return mesh(parent, extrude(archShape(r, t), depth), m, x, y, z - depth / 2);
}

function buildWall(parent, { x, z, len, rot = 0, h = 9, door = true, windows = false }, ruins, seed) {
  const group = new THREE.Group();
  group.position.set(x, FLOOR, z);
  group.rotation.y = rot;
  parent.add(group);
  const s = new THREE.Shape(), r = 1.65, spring = 2.6, rand = random(seed), height = ruins ? 5.1 + rand() * 1.8 : h;
  s.moveTo(-len / 2, 0);
  if (door) {
    s.lineTo(-r, 0);
    s.lineTo(-r, spring);
    s.absarc(0, spring, r, Math.PI, 0, true);
    s.lineTo(r, 0);
  }
  s.lineTo(len / 2, 0);
  s.lineTo(len / 2, height);
  if (ruins) {
    for (let u = len / 2; u >= -len / 2; u -= 0.65) s.lineTo(u, height + (rand() - 0.5) * 1.25);
  } else {
    s.lineTo(-len / 2, height);
  }
  s.lineTo(-len / 2, 0);
  s.closePath();

  if (windows && !ruins) {
    for (const wx of [-len * 0.3, len * 0.3]) {
      const hole = new THREE.Path();
      hole.moveTo(wx - 0.85, 5.5);
      hole.lineTo(wx + 0.85, 5.5);
      hole.lineTo(wx + 0.85, 6.5);
      hole.absarc(wx, 6.5, 0.85, 0, Math.PI, false);
      hole.lineTo(wx - 0.85, 5.5);
      s.holes.push(hole);
    }
  }

  mesh(group, extrude(s, 1.05), material(ruins ? 'brick' : 'plaster'), 0, 0, -0.525);
  box(group, len, FLOOR + 0.25, 1.15, 0, -(FLOOR + 0.25) / 2, 0, material('brick'));
  const sides = door ? [[-(len / 2 + r) / 2, (len / 2 - r)], [(len / 2 + r) / 2, (len / 2 - r)]] : [[0, len]];
  sides.forEach(([cx, w]) => {
    box(group, w, 0.45, 1.22, cx, 0.225, 0, material('stone'));
    if (!ruins) {
      box(group, w, 1.05, 1.075, cx, 0.65, 0, material('brick'));
      box(group, w, 0.10, 1.16, cx, 1.22, 0, material('stone'));
    }
  });

  if (door) {
    buildArch(group, r, 0.28, 1.22, 0, spring, 0, material('stone'));
    [-1, 1].forEach(sign => box(group, 0.28, spring, 1.22, sign * (r + 0.14), spring / 2, 0, material('stone')));
  }

  if (!ruins) {
    box(group, len, 0.23, 1.3, 0, h - 0.12, 0, material('stone'));
    box(group, len, 0.13, 1.43, 0, h + 0.035, 0, material('stone'));
    box(group, len, 0.12, 1.17, 0, h - 0.36, 0, material('terra'));
    for (let px = -len / 2 + 1; px < len / 2; px += 5) {
      if (Math.abs(px) < 2.1) continue;
      if (windows && Math.abs(Math.abs(px) - len * 0.3) < 1.2) continue;
      box(group, 0.45, h - 1.4, 1.19, px, (h + 1.4) / 2, 0, material('stone'));
    }
    if (windows) {
      for (const wx of [-len * 0.3, len * 0.3]) buildArch(group, 0.85, 0.15, 1.18, wx, 6.5, 0, material('stone'));
    }
  }
  return group;
}

function column(parent, x, z, ruins, index) {
  const m = material('marble'), h = ruins ? 1.1 + (index % 4) * 0.7 : 6.5;
  box(parent, 1.35, 0.22, 1.35, x, FLOOR + 0.11, z, m);
  const parts = [[0.67, 0.67, 0.18, 0.31], [0.57, 0.63, 0.18, 0.49], [0.42, 0.52, h, 0.58 + h / 2], [0.58, 0.45, 0.24, 0.58 + h + 0.12], [0.68, 0.58, 0.22, 0.58 + h + 0.35]];
  parts.forEach(([rt, rb, height, y]) => {
    if (ruins && y > h + 0.58) return;
    const g = geometry(`c${rt},${rb},${height}`, () => {
      const g = new THREE.CylinderGeometry(rt, rb, height, 32);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setX(i, uv.getX(i) * Math.PI * (rt + rb) / 4);
        uv.setY(i, uv.getY(i) * height / 4);
      }
      return g;
    });
    mesh(parent, g, m, x, FLOOR + y, z);
  });
  if (!ruins) box(parent, 1.45, 0.24, 1.45, x, FLOOR + h + 1.05, z, m);
}

function buildVault(parent, cx, width, length) {
  const g = new THREE.Group();
  parent.add(g);
  const r = width / 2, s = archShape(r, 0.38);
  mesh(g, extrude(s, length), material('plaster'), cx, FLOOR + 9, -length / 2);
  roofTiles(g, cx, r, length);
  gable(g, cx, r, -length / 2);
  gable(g, cx, r, length / 2);
  for (let z = -length / 2; z <= length / 2; z += length / 4) {
    buildArch(g, r - 0.17, 0.17, 0.23, cx, FLOOR + 9, z, material('stone'));
  }
  return g;
}

function buildFloor(parent, cx, w, depth, pool) {
  const m = material('stone');
  if (!pool) {
    box(parent, w, 0.28, depth, cx, FLOOR - 0.14, 0, m);
    return;
  }
  const pw = pool.w, pd = pool.d;
  box(parent, (w - pw) / 2, 0.28, depth, cx - (w + pw) / 4, FLOOR - 0.14, 0, m);
  box(parent, (w - pw) / 2, 0.28, depth, cx + (w + pw) / 4, FLOOR - 0.14, 0, m);
  [-1, 1].forEach(sign => box(parent, pw, 0.28, (depth - pd) / 2, cx, FLOOR - 0.14, sign * (depth + pd) / 4, m));
}

function pool(parent, cx, w, d, ruins, waterList) {
  const m = material('marble');
  box(parent, w, 0.2, d, cx, 0.12, 0, material('mosaic'));
  [-1, 1].forEach(sign => {
    box(parent, 0.24, 1.35, d, cx + sign * (w / 2 + 0.12), 0.8, 0, m);
    box(parent, w + 0.7, 0.2, 0.38, cx, FLOOR + 0.02, sign * (d / 2 + 0.2), m);
    box(parent, 0.38, 0.2, d, cx + sign * (w / 2 + 0.2), FLOOR + 0.02, 0, m);
    box(parent, w, 1.35, 0.24, cx, 0.8, sign * (d / 2 + 0.12), m);
  });
  for (let i = 0; i < 4; i++) box(parent, 3, 0.28 * (i + 1), 0.48, cx, 0.22 + 0.14 * (i + 1), d / 2 - 0.24 - i * 0.48, m);
  if (!ruins) {
    const geo = new THREE.PlaneGeometry(w - 0.1, d - 0.1, 36, 48);
    geo.rotateX(-Math.PI / 2);
    const wm = new THREE.MeshPhysicalMaterial({
      color: 0x57aaa0,
      roughness: 0.19,
      metalness: 0,
      transparent: true,
      opacity: 0.58,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      depthWrite: false
    });
    const water = mesh(parent, geo, wm, cx, 1.25, 0);
    water.castShadow = false;
    waterList.push(water);
  }
}

function steamTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const q = c.getContext('2d'), g = q.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(245,245,230,.5)');
  g.addColorStop(0.4, 'rgba(245,245,230,.18)');
  g.addColorStop(1, 'rgba(245,245,230,0)');
  q.fillStyle = g;
  q.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function terrainHeight(x, z) {
  const edge = Math.max(Math.abs(x) - 39, Math.abs(z) - 30);
  return -0.28 + Math.min(Math.max(edge / 14, 0), 1) * (Math.sin(x * 0.063) * Math.cos(z * 0.079) * 0.8 + Math.sin(x * 0.21 + z * 0.08) * 0.23);
}

function environment(scene, ruins) {
  const rand = random(593), g = new THREE.PlaneGeometry(260, 260, 130, 130);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, terrainHeight(x, z));
    const v = 0.5 + 0.24 * Math.sin(x * 0.15 + Math.cos(z * 0.17) * 2) + 0.15 * Math.cos(z * 0.23 - x * 0.06);
    const c = new THREE.Color().setHSL(0.19 + v * 0.035, 0.19 + v * 0.12, 0.29 + v * 0.16);
    if (Math.abs(x) < 40 && Math.abs(z) < 30) c.setHSL(0.105, 0.18, 0.49);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  metricUV(g, 5);
  const tm = material('earth').clone();
  tm.vertexColors = true;
  tm.color.set(0xffffff);
  const terrain = mesh(scene, g, tm);
  terrain.castShadow = false;

  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute([-0.035, 0, 0, 0.035, 0, 0, -0.023, 0.28, 0.035, 0.023, 0.28, 0.035, 0.035, 0.62, 0.12], 3));
  bg.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  bg.computeVertexNormals();
  const gm = new THREE.MeshStandardMaterial({ color: 0xb3bb79, roughness: 1, side: THREE.DoubleSide });
  const wind = { value: 0 };
  gm.onBeforeCompile = shader => {
    shader.uniforms.windTime = wind;
    shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x += sin(windTime*1.3 + instanceMatrix[3].x*.38 + instanceMatrix[3].z*.27)*position.y*position.y*.13;\n#endif'
    );
  };

  const count = 24000, grass = new THREE.InstancedMesh(bg, gm, count), dummy = new THREE.Object3D();
  let placed = 0;
  while (placed < count) {
    const x = (rand() - 0.5) * 170, z = (rand() - 0.5) * 150;
    const exterior = Math.abs(x) > 39 || Math.abs(z) > 30;
    const approach = Math.abs(x) < 4.6 && z > 25 && z < 62;
    if (!exterior || approach) continue;
    const density = 0.5 + 0.3 * Math.sin(x * 0.12) * Math.cos(z * 0.13);
    if (rand() > density) continue;
    dummy.position.set(x, terrainHeight(x, z), z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const h = 0.35 + rand() * 0.95;
    dummy.scale.set(0.5 + rand(), h, 0.5 + rand());
    dummy.updateMatrix();
    grass.setMatrixAt(placed, dummy.matrix);
    grass.setColorAt(placed, new THREE.Color().setHSL(0.18 + rand() * 0.07, 0.24 + rand() * 0.2, 0.36 + rand() * 0.19));
    placed++;
  }
  grass.receiveShadow = true;
  grass.castShadow = false;
  scene.add(grass);

  const treeGroup = new THREE.Group();
  scene.add(treeGroup);
  const foliage = new THREE.MeshStandardMaterial({ color: 0x4b6040, roughness: 1 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x6f6047, roughness: 1 });
  const treePositions = [[-47, -25], [-47, -12], [-47, 2], [-47, 18], [46, -27], [49, -11], [48, 8], [49, 26], [-24, -39], [-8, -42], [13, -40], [31, -39], [-57, 37], [58, 38], [-34, 47], [32, 47]];
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), foliage, treePositions.length * 5);
  let j = 0;
  treePositions.forEach(([x, z]) => {
    const y = terrainHeight(x, z), h = 6 + rand() * 3;
    mesh(treeGroup, geometry('tree-trunk', () => new THREE.CylinderGeometry(0.16, 0.32, 3.5, 9)), bark, x, y + 1.75, z);
    for (let k = 0; k < 5; k++) {
      dummy.position.set(x + (rand() - 0.5) * 0.35, y + 2 + k * h * 0.14, z + (rand() - 0.5) * 0.35);
      dummy.rotation.set(rand(), rand() * 6, rand());
      const radius = (1 - k * 0.15) * (1 + rand() * 0.24);
      dummy.scale.set(radius, h * 0.24, radius);
      dummy.updateMatrix();
      crowns.setMatrixAt(j, dummy.matrix);
      crowns.setColorAt(j, new THREE.Color().setHSL(0.21 + rand() * 0.04, 0.22, 0.30 + rand() * 0.11));
      j++;
    }
  });
  crowns.castShadow = crowns.receiveShadow = true;
  treeGroup.add(crowns);

  const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), foliage, 90);
  for (let i = 0; i < 90; i++) {
    const side = i % 2 ? -1 : 1, x = side * (39 + rand() * 5), z = (rand() - 0.5) * 56;
    dummy.position.set(x, terrainHeight(x, z) + 0.25, z);
    dummy.rotation.set(rand(), rand() * 6, rand());
    dummy.scale.set(0.35 + rand() * 0.55, 0.25 + rand() * 0.55, 0.4 + rand() * 0.6);
    dummy.updateMatrix();
    shrubs.setMatrixAt(i, dummy.matrix);
    shrubs.setColorAt(i, new THREE.Color().setHSL(0.18 + rand() * 0.08, 0.22, 0.36 + rand() * 0.1));
  }
  shrubs.castShadow = shrubs.receiveShadow = true;
  scene.add(shrubs);

  box(scene, 8.2, 0.16, 35, 0, -0.12, 44, material('stone'));
  for (let i = 0; i < 6; i++) {
    box(scene, 7.5, 0.27 * (6 - i), 1, 0, -0.28 + 0.135 * (6 - i), 26.3 + i, material('stone'));
  }

  return {
    wind,
    grass,
    shrubs,
    setQuality(q) {
      grass.count = q === 'high' ? count : 6500;
      shrubs.castShadow = q === 'high';
      crowns.castShadow = q === 'high';
    }
  };
}

function roofTiles(parent, cx, r, length) {
  const geo = geometry('roofTile', () => {
    const pos = [], idx = [];
    for (let z of [-0.42, 0.42]) {
      for (let i = 0; i < 5; i++) {
        const x = -0.27 + i * 0.135;
        pos.push(x, 0.07 * Math.cos(x / 0.27 * Math.PI / 2), z);
      }
    }
    for (let i = 0; i < 4; i++) idx.push(i, i + 5, i + 1, i + 1, i + 5, i + 6);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return metricUV(g, 1);
  });
  const across = Math.ceil(Math.PI * (r + 0.4) / 0.5), rows = Math.ceil(length / 0.70), n = across * rows;
  const tiles = new THREE.InstancedMesh(geo, material('terra'), n), o = new THREE.Object3D(), rand = random(Math.round(cx + 300));
  let k = 0;
  for (let a = 0; a < across; a++) {
    const t = (a + 0.5) * Math.PI / across;
    for (let j = 0; j < rows; j++) {
      o.position.set(cx + Math.cos(t) * (r + 0.405), FLOOR + 9 + Math.sin(t) * (r + 0.405), -length / 2 + (j + 0.5) * length / rows);
      o.rotation.set(0, 0, t - Math.PI / 2);
      o.updateMatrix();
      tiles.setMatrixAt(k, o.matrix);
      tiles.setColorAt(k, new THREE.Color().setHSL(0.045 + rand() * 0.015, 0.34, 0.59 + rand() * 0.16));
      k++;
    }
  }
  tiles.castShadow = tiles.receiveShadow = true;
  parent.add(tiles);
}

function gable(parent, cx, r, z) {
  const shape = new THREE.Shape();
  shape.moveTo(-r, 0);
  shape.lineTo(r, 0);
  shape.absarc(0, 0, r, 0, Math.PI, false);
  shape.closePath();
  const y = r * 0.43, hr = Math.min(1.25, r * 0.2), hole = new THREE.Path();
  hole.absarc(0, y, hr, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  mesh(parent, extrude(shape, 0.38), material('plaster'), cx, FLOOR + 9, z - 0.19);
  const ring = geometry('oculus' + hr, () => new THREE.TorusGeometry(hr + 0.11, 0.13, 8, 48));
  mesh(parent, ring, material('stone'), cx, FLOOR + 9 + y, z + 0.24);
}

function mkView(id, ruins) {
  const el = document.getElementById(id);
  if (!el) return null;
  el.innerHTML = `
    <button class="info-toggle-btn" aria-label="Информация за помещението" aria-expanded="false" title="Информация за залата">
      <span class="info-toggle-label">Общ изглед</span>
      <span class="info-toggle-arrow">▾</span>
    </button>
    <aside class="info" aria-label="Информация за помещението">
      <div class="info-header-bar">
        <span class="eyebrow">${ruins ? 'Следите на времето' : 'Архитектурна възстановка'}</span>
        <button class="info-close-btn" aria-label="Затвори информационния панел" title="Затвори">✕</button>
      </div>
      <h2></h2>
      <p></p>
      <footer>ИЛЮСТРАТИВНА РЕКОНСТРУКЦИЯ · 1 ЕД. = 1 М</footer>
    </aside>
    <button class="options-toggle-btn" aria-label="Опции на изгледа" aria-expanded="false" title="Опции">
      <span class="options-toggle-label">Опции</span>
    </button>
    <div class="toolbar" aria-label="Опции на изгледа">
      <div class="toolbar-header">
        <span class="toolbar-title">Опции</span>
        <button class="toolbar-close-btn" aria-label="Затвори опциите" title="Затвори">✕</button>
      </div>
      <button data-action="overview">↗ Общ изглед</button>
      <button data-action="freeroam" class="freeroam-btn">🚶 Свободна разходка</button>
      <label class="option-check">
        <input type="checkbox" data-action="visitor-opt" checked />
        <span>Ниво на посетителя</span>
      </label>
      <button data-action="roof" aria-pressed="true">🏛️ Махни покривите</button>
      <label>Качество<select aria-label="Качество"><option value="high">Високо</option><option value="low">Икономично</option></select></label>
    </div>
    <div class="freeroam-hud" hidden>
      <div class="freeroam-hud-header">
        <span class="freeroam-hud-badge">🚶 СВОБОДНА РАЗХОДКА (FREE ROAM)</span>
        <button class="freeroam-exit-btn" aria-label="Изход от свободната разходка" title="Изход (Esc)">✕ Изход</button>
      </div>
      <div class="freeroam-hud-controls">
        <div class="freeroam-key-item"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> или <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> Ходене</div>
        <div class="freeroam-key-item"><kbd>Мишка</kbd> Оглеждане</div>
        <div class="freeroam-key-item"><kbd>Shift</kbd> Бърз ход · <kbd>Esc</kbd> Изход</div>
      </div>
    </div>
    <button class="rooms-toggle-btn" aria-label="Избери помещение" aria-expanded="false" title="Избери помещение">
      <svg class="rooms-toggle-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>
    <div class="bar" aria-label="Помещения"></div>
    <div class="hint">Плъзни за завъртане · Колелце за приближаване · Десен бутон за преместване</div>
  `;

  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0xc9dbe3);
  sc.fog = new THREE.Fog(0xc9dbe3, 130, 270);
  const cam = new THREE.PerspectiveCamera(43, 1, 0.12, 400);
  cam.position.set(...ROOMS.all.c);
  const rn = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  rn.outputEncoding = THREE.sRGBEncoding;
  rn.toneMapping = THREE.ACESFilmicToneMapping;
  rn.toneMappingExposure = 1.08;
  rn.shadowMap.enabled = true;
  rn.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(rn.domElement);
  rn.domElement.setAttribute('aria-label', 'Интерактивен 3D модел на термите');
  rn.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    fail('Графичният контекст е прекъснат. Презаредете страницата и изберете икономично качество.');
  });

  const ct = new THREE.OrbitControls(cam, rn.domElement);
  ct.enableDamping = true;
  ct.dampingFactor = 0.08;
  ct.maxPolarAngle = Math.PI / 2 - 0.015;
  ct.minDistance = 1.2;
  ct.maxDistance = 140;
  ct.target.set(...ROOMS.all.t);
  ct.screenSpacePanning = false;

  sc.add(new THREE.HemisphereLight(0xe8f0ff, 0x6b5941, 0.65));
  sc.add(new THREE.AmbientLight(0xfff0d9, 0.13));
  const sun = new THREE.DirectionalLight(0xffebcb, 2.25);
  sun.position.set(-42, 56, 38);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 160 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = 3;
  sc.add(sun);

  const landscape = environment(sc, ruins);
  box(sc, 73, 0.45, 53, 0, -0.08, 0, material('stone'));
  const roofs = new THREE.Group();
  sc.add(roofs);
  const waterList = [], steam = [], model = new THREE.Group();
  sc.add(model);

  const halls = [{ x: -6.5, w: 17, p: { w: 8, d: 15 } }, { x: 8, w: 12 }, { x: 24.5, w: 21, p: { w: 11, d: 18 } }];
  buildFloor(model, -25, 19, 48);
  halls.forEach(a => {
    buildFloor(model, a.x, a.w - 1.05, 31, a.p);
    if (a.p) pool(model, a.x, a.p.w, a.p.d, ruins, waterList);
    buildVault(roofs, a.x, a.w, 32);
  });

  [-1, 1].forEach(sign => {
    if (ruins && sign === -1) {
      box(model, 29, 0.28, 8, -0.5, FLOOR - 0.14, -20.5, material('stone'));
    } else {
      box(model, 50, 0.28, 8, 10, FLOOR - 0.14, sign * 20.5, material('stone'));
    }
  });

  const walls = [
    { x: -35, z: 0, len: 50, rot: Math.PI / 2, h: 4.8 },
    { x: 35, z: 0, len: 50, rot: Math.PI / 2, h: 9, windows: true },
    { x: 0, z: -25, len: 70, h: 5.4, windows: false },
    { x: 0, z: 25, len: 70, h: 5.4, windows: false },
    ...[-15, 2, 14].map(x => ({ x, z: 0, len: 32, rot: Math.PI / 2, h: 9, windows: true })),
    ...halls.flatMap(a => [-16, 16].map(z => ({ x: a.x, z, len: a.w, h: 9, windows: true })))
  ];
  walls.forEach((w, i) => buildWall(model, w, ruins, i + 102));

  let ci = 0;
  for (let z = -19; z <= 19; z += 6.3) {
    column(model, -31, z, ruins, ci++);
    column(model, -19, z, ruins, ci++);
  }
  [-31, -19].forEach(x => {
    if (!ruins) box(model, 1.45, 0.65, 40, x, FLOOR + 7.9, 0, material('stone'));
    box(roofs, 3, 0.22, 41, x, FLOOR + 8.4, 0, material('terra'));
  });
  if (ruins) roofs.visible = false;

  halls.forEach(a => {
    [-1, 1].forEach(sign => {
      for (let z = -11; z <= 11; z += 11) column(model, a.x + sign * (a.w / 2 - 1.7), z, ruins, ci++);
    });
  });

  box(model, 6, 0.025, 25, 8, FLOOR + 0.015, 0, material('mosaic'));
  for (const x of [4.85, 11.15]) box(model, 0.18, 0.028, 25, x, FLOOR + 0.02, 0, material('terra'));

  if (ruins) {
    const rand = random(81), g = geometry('rubble', () => metricUV(new THREE.DodecahedronGeometry(0.5, 0))),
      rubble = new THREE.InstancedMesh(g, material('brick'), 110), dummy = new THREE.Object3D();
    for (let i = 0; i < 110; i++) {
      const w = walls[i % walls.length];
      let u = (rand() - 0.5) * w.len;
      dummy.position.set(w.x + Math.cos(w.rot) * u + (rand() - 0.5) * 2.5, FLOOR + 0.22, w.z - Math.sin(w.rot) * u + (rand() - 0.5) * 2.5);
      dummy.rotation.set(rand() * 3, rand() * 6, rand() * 3);
      dummy.scale.set(0.4 + rand(), 0.3 + rand() * 0.6, 0.4 + rand());
      dummy.updateMatrix();
      rubble.setMatrixAt(i, dummy.matrix);
    }
    rubble.castShadow = rubble.receiveShadow = true;
    model.add(rubble);

    const pilae = new THREE.InstancedMesh(geometry('pila', () => metricUV(new THREE.BoxGeometry(0.45, 1.2, 0.45), 1)), material('brick'), 60);
    let ix = 0;
    for (let x = 17; x < 33; x += 1.6) {
      for (let z = -23; z < -17; z += 1) {
        dummy.position.set(x, 0.65, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pilae.setMatrixAt(ix++, dummy.matrix);
      }
    }
    pilae.castShadow = pilae.receiveShadow = true;
    model.add(pilae);

    const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.27, 0.7, 5), new THREE.MeshStandardMaterial({ color: 0x64754b, roughness: 1 }), 85);
    for (let i = 0; i < 85; i++) {
      const w = walls[i % walls.length], u = (rand() - 0.5) * w.len;
      dummy.position.set(w.x + Math.cos(w.rot) * u + (rand() - 0.5) * 2, FLOOR + 0.16, w.z - Math.sin(w.rot) * u + (rand() - 0.5) * 2);
      dummy.rotation.set(0, rand() * 6, 0);
      dummy.scale.set(1, 0.4 + rand(), 1);
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    model.add(grass);
  } else {
    const tex = steamTexture(), rand = random(21);
    for (let i = 0; i < 28; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.13 });
      const s = new THREE.Sprite(m);
      s.userData = { x: 20 + rand() * 9, z: -7 + rand() * 14, phase: rand(), speed: 0.05 + rand() * 0.035 };
      s.scale.set(2.3, 2.8, 1);
      sc.add(s);
      steam.push(s);
    }
  }

  let visitorMode = true;
  let transition = null, selected = 'all', elapsed = 0;
  ct.addEventListener('start', () => { transition = null; });

  function travel(c, t) {
    transition = { c0: cam.position.clone(), t0: ct.target.clone(), c1: new THREE.Vector3(...c), t1: new THREE.Vector3(...t), age: 0 };
  }

  function getCameraTargetForRoom(k, isVisitor) {
    if (k === 'all') {
      return { c: ROOMS.all.c, t: ROOMS.all.t };
    }
    if (isVisitor) {
      const x = k === 'pal' ? -25 : k === 'tep' ? 8 : k === 'cal' ? 24.5 : -6.5;
      return { c: [x - 2, FLOOR + 1.65, 12], t: [x, FLOOR + 1.65, -5] };
    }
    return { c: ROOMS[k].c, t: ROOMS[k].t };
  }

  const toggleBtn = el.querySelector('.info-toggle-btn');
  const infoAside = el.querySelector('.info');
  const closeBtn = el.querySelector('.info-close-btn');
  const toggleLabel = el.querySelector('.info-toggle-label');
  const toggleArrow = el.querySelector('.info-toggle-arrow');

  function toggleInfo(open) {
    if (!infoAside) return;
    const shouldOpen = open !== undefined ? open : !infoAside.classList.contains('open');
    infoAside.classList.toggle('open', shouldOpen);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', String(shouldOpen));
      toggleBtn.classList.toggle('active', shouldOpen);
      if (toggleArrow) toggleArrow.textContent = shouldOpen ? '▴' : '▾';
    }
  }

  if (toggleBtn) {
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      toggleInfo();
    };
  }

  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      toggleInfo(false);
    };
  }

  const roomsToggleBtn = el.querySelector('.rooms-toggle-btn');
  const bar = el.querySelector('.bar');

  function toggleRoomsDropup(open) {
    if (!bar) return;
    const shouldOpen = open !== undefined ? open : !bar.classList.contains('open');
    bar.classList.toggle('open', shouldOpen);
    if (roomsToggleBtn) {
      roomsToggleBtn.setAttribute('aria-expanded', String(shouldOpen));
      roomsToggleBtn.classList.toggle('active', shouldOpen);
    }
  }

  if (roomsToggleBtn) {
    roomsToggleBtn.onclick = (e) => {
      e.stopPropagation();
      toggleRoomsDropup();
    };
  }

  const optionsToggleBtn = el.querySelector('.options-toggle-btn');
  const toolbar = el.querySelector('.toolbar');
  const toolbarCloseBtn = el.querySelector('.toolbar-close-btn');

  function toggleToolbar(open) {
    if (!toolbar) return;
    const shouldOpen = open !== undefined ? open : !toolbar.classList.contains('open');
    toolbar.classList.toggle('open', shouldOpen);
    if (optionsToggleBtn) {
      optionsToggleBtn.setAttribute('aria-expanded', String(shouldOpen));
      optionsToggleBtn.classList.toggle('active', shouldOpen);
    }
  }

  if (optionsToggleBtn) {
    optionsToggleBtn.onclick = (e) => {
      e.stopPropagation();
      toggleToolbar();
    };
  }

  if (toolbarCloseBtn) {
    toolbarCloseBtn.onclick = (e) => {
      e.stopPropagation();
      toggleToolbar(false);
    };
  }

  const handleDocumentClick = (e) => {
    if (infoAside && infoAside.classList.contains('open')) {
      if (!infoAside.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
        toggleInfo(false);
      }
    }
    if (bar && bar.classList.contains('open')) {
      if (!bar.contains(e.target) && (!roomsToggleBtn || !roomsToggleBtn.contains(e.target))) {
        toggleRoomsDropup(false);
      }
    }
    if (toolbar && toolbar.classList.contains('open')) {
      if (!toolbar.contains(e.target) && (!optionsToggleBtn || !optionsToggleBtn.contains(e.target))) {
        toggleToolbar(false);
      }
    }
  };
  document.addEventListener('click', handleDocumentClick);

  let isFreeRoam = false;
  let yaw = 0, pitch = 0;
  let walkPhase = 0;
  const moveKeys = { forward: false, backward: false, left: false, right: false, sprint: false };
  const _forward = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _moveDir = new THREE.Vector3();

  const freeroamBtn = el.querySelector('[data-action="freeroam"]');
  const freeroamHud = el.querySelector('.freeroam-hud');
  const freeroamExitBtn = el.querySelector('.freeroam-exit-btn');

  function startFreeRoam() {
    isFreeRoam = true;
    ct.enabled = false;
    transition = null;

    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    yaw = Math.atan2(-dir.x, -dir.z);
    pitch = Math.asin(Math.max(-0.95, Math.min(0.95, dir.y)));

    if (cam.position.y > FLOOR + 3.2 || cam.position.distanceTo(new THREE.Vector3(0, FLOOR, 0)) > 55) {
      cam.position.set(-14, FLOOR + 1.65, 8);
      yaw = 0.5;
      pitch = 0.04;
    } else {
      cam.position.y = FLOOR + 1.65;
    }

    if (freeroamHud) freeroamHud.hidden = false;
    if (freeroamBtn) freeroamBtn.setAttribute('aria-pressed', 'true');
    toggleToolbar(false);

    try {
      rn.domElement.requestPointerLock?.();
    } catch (_) {}
  }

  function stopFreeRoam() {
    if (!isFreeRoam) return;
    isFreeRoam = false;
    ct.enabled = true;
    if (document.pointerLockElement === rn.domElement) {
      document.exitPointerLock?.();
    }
    if (freeroamHud) freeroamHud.hidden = true;
    if (freeroamBtn) freeroamBtn.setAttribute('aria-pressed', 'false');

    Object.keys(moveKeys).forEach(k => moveKeys[k] = false);

    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    ct.target.copy(cam.position).addScaledVector(dir, 12);
    ct.update();
  }

  if (freeroamBtn) {
    freeroamBtn.onclick = () => {
      if (isFreeRoam) stopFreeRoam();
      else startFreeRoam();
    };
  }

  if (freeroamExitBtn) {
    freeroamExitBtn.onclick = () => stopFreeRoam();
  }

  rn.domElement.addEventListener('click', () => {
    if (isFreeRoam && document.pointerLockElement !== rn.domElement) {
      try {
        rn.domElement.requestPointerLock?.();
      } catch (_) {}
    }
  });

  function onMouseMove(e) {
    if (!isFreeRoam) return;
    const isLocked = document.pointerLockElement === rn.domElement;
    if (isLocked || (e.buttons & 1)) {
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      const sensitivity = 0.0024;
      yaw -= movementX * sensitivity;
      pitch -= movementY * sensitivity;
      pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, pitch));
    }
  }
  window.addEventListener('mousemove', onMouseMove);

  function onKeyDown(e) {
    if (e.code === 'Escape' && isFreeRoam) {
      stopFreeRoam();
      return;
    }
    if (!isFreeRoam) return;
    if (['KeyW', 'ArrowUp'].includes(e.code)) { moveKeys.forward = true; e.preventDefault(); }
    if (['KeyS', 'ArrowDown'].includes(e.code)) { moveKeys.backward = true; e.preventDefault(); }
    if (['KeyA', 'ArrowLeft'].includes(e.code)) { moveKeys.left = true; e.preventDefault(); }
    if (['KeyD', 'ArrowRight'].includes(e.code)) { moveKeys.right = true; e.preventDefault(); }
    if (['ShiftLeft', 'ShiftRight'].includes(e.code)) moveKeys.sprint = true;
  }

  function onKeyUp(e) {
    if (['KeyW', 'ArrowUp'].includes(e.code)) moveKeys.forward = false;
    if (['KeyS', 'ArrowDown'].includes(e.code)) moveKeys.backward = false;
    if (['KeyA', 'ArrowLeft'].includes(e.code)) moveKeys.left = false;
    if (['KeyD', 'ArrowRight'].includes(e.code)) moveKeys.right = false;
    if (['ShiftLeft', 'ShiftRight'].includes(e.code)) moveKeys.sprint = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function go(k) {
    if (isFreeRoam) {
      stopFreeRoam();
    }
    selected = k;
    el.querySelector('h2').textContent = ROOMS[k].n;
    el.querySelector('.info p').textContent = ruins ? 'Условен изглед на разрушението. ' + ROOMS[k].r : ROOMS[k].d;
    if (toggleLabel) toggleLabel.textContent = ROOMS[k].n;
    el.querySelectorAll('.bar button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    const target = getCameraTargetForRoom(k, visitorMode);
    travel(target.c, target.t);

    if (window.innerWidth <= 768) {
      toggleRoomsDropup(false);
    }
  }

  KEYS.forEach(k => {
    const b = document.createElement('button');
    b.textContent = ROOMS[k].n;
    b.dataset.k = k;
    b.onclick = () => go(k);
    bar.appendChild(b);
  });

  el.querySelector('[data-action=overview]').onclick = () => go('all');

  const visitorCheckbox = el.querySelector('[data-action="visitor-opt"]');
  if (visitorCheckbox) {
    visitorCheckbox.checked = visitorMode;
    visitorCheckbox.onchange = e => {
      visitorMode = e.target.checked;
      if (selected !== 'all') {
        const target = getCameraTargetForRoom(selected, visitorMode);
        travel(target.c, target.t);
      }
    };
  }

  const rb = el.querySelector('[data-action=roof]');
  if (rb) {
    if (ruins) {
      roofs.visible = false;
      rb.textContent = '🏛️ Покажи покривите';
      rb.setAttribute('aria-pressed', 'false');
    } else {
      roofs.visible = true;
      rb.textContent = '🏛️ Махни покривите';
      rb.setAttribute('aria-pressed', 'true');
    }
    rb.disabled = false;
    rb.onclick = () => {
      roofs.visible = !roofs.visible;
      rb.textContent = roofs.visible ? '🏛️ Махни покривите' : '🏛️ Покажи покривите';
      rb.setAttribute('aria-pressed', String(roofs.visible));
    };
  }

  function fit() {
    if (!el.clientWidth || !el.clientHeight) return;
    rn.setSize(el.clientWidth, el.clientHeight, false);
    cam.aspect = el.clientWidth / el.clientHeight;
    cam.updateProjectionMatrix();
  }

  function setQuality(q) {
    landscape.setQuality(q);
    rn.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 1.75 : 1));
    sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    steam.forEach((s, i) => s.visible = q === 'high' || i < 9);
    fit();
    el.querySelector('select').value = q;
  }

  el.querySelector('select').onchange = e => {
    quality = e.target.value;
    setQuality(quality);
  };
  setQuality(quality);
  go('all');
  transition = null;
  window.addEventListener('resize', fit);

  return {
    fit,
    setQuality,
    tick(dt) {
      elapsed += dt;
      landscape.wind.value = elapsed;
      if (isFreeRoam) {
        _moveDir.set(0, 0, 0);
        _forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
        _right.set(-_forward.z, 0, _forward.x);

        if (moveKeys.forward) _moveDir.add(_forward);
        if (moveKeys.backward) _moveDir.sub(_forward);
        if (moveKeys.right) _moveDir.add(_right);
        if (moveKeys.left) _moveDir.sub(_right);

        const len = _moveDir.length();
        if (len > 0.0001) {
          _moveDir.normalize();
          const speed = (moveKeys.sprint ? 9.5 : 4.5) * dt;
          cam.position.addScaledVector(_moveDir, speed);

          walkPhase += dt * (moveKeys.sprint ? 14 : 9);
        }

        // Clamp camera position inside Roman baths boundary
        cam.position.x = Math.max(-36, Math.min(36, cam.position.x));
        cam.position.z = Math.max(-30, Math.min(30, cam.position.z));

        const headBob = len > 0.0001 ? Math.sin(walkPhase) * 0.03 : 0;
        cam.position.y = FLOOR + 1.65 + headBob;

        const lookX = cam.position.x - Math.sin(yaw) * Math.cos(pitch);
        const lookY = cam.position.y + Math.sin(pitch);
        const lookZ = cam.position.z - Math.cos(yaw) * Math.cos(pitch);
        cam.lookAt(lookX, lookY, lookZ);
      } else {
        if (transition) {
          transition.age += dt;
          const u = Math.min(transition.age / 1.4, 1), e = u * u * (3 - 2 * u);
          cam.position.lerpVectors(transition.c0, transition.c1, e);
          ct.target.lerpVectors(transition.t0, transition.t1, e);
          if (u === 1) transition = null;
        }
        ct.dampingFactor = 1 - Math.pow(0.92, dt * 60);
        ct.update();
        cam.position.y = Math.max(0.6, cam.position.y);
        ct.target.y = Math.max(0.3, ct.target.y);
      }
      waterList.forEach(w => {
        const a = w.geometry.attributes.position;
        for (let i = 0; i < a.count; i++) {
          a.setY(i, Math.sin(a.getX(i) * 2 + elapsed * 0.85) * 0.018 + Math.sin(a.getZ(i) * 1.8 - elapsed * 0.65) * 0.012);
        }
        a.needsUpdate = true;
        w.geometry.computeVertexNormals();
      });
      steam.forEach(s => {
        let u = (s.userData.phase + elapsed * s.userData.speed) % 1;
        s.position.set(s.userData.x + Math.sin(elapsed * 0.2 + s.userData.phase * 6) * 0.5, 1.4 + u * 3.2, s.userData.z);
        s.material.opacity = Math.sin(u * Math.PI) * 0.17;
        s.scale.set(1.4 + u * 2, 1.6 + u * 2, 1);
      });
      rn.render(sc, cam);
    }
  };
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

window.startThermaeScene = async function(containerId, isRuins) {
  try {
    if (!window.THREE) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    }
    if (!THREE.OrbitControls) {
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
    }
    const view = mkView(containerId, isRuins);
    if (!view) return;
    view.fit();
    last = performance.now();

    function loop(time) {
      requestAnimationFrame(loop);
      const dt = Math.min(Math.max((time - last) / 1000, 0), 0.05);
      last = time;
      if (!document.hidden) view.tick(dt);
    }
    loop(performance.now());
  } catch (e) {
    console.error(e);
    fail('3D изгледът не може да се зареди. Проверете интернет връзката и дали браузърът поддържа WebGL.');
  }
};
