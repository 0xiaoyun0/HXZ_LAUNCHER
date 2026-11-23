import * as THREE from 'three';

// Rhine-Music-Database Qt/src/DiscGeometry.{h,cpp}: keep the original shell,
// replace its optical internals with a real annular disc (including its hole).
export function discAnnulus(inner: number, outer: number, front: number, back: number, solid = true) {
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [];
  const point = (radius: number, angle: number, z: number) => [radius * Math.cos(angle), 1.85 + radius * Math.sin(angle), z];
  const triangle = (a: number[], b: number[], c: number[], normal: number[]) => {
    for (const p of [a, b, c]) { positions.push(...p); normals.push(...normal); uvs.push(.5 + p[0] / 3.02, .5 + (p[1] - 1.85) / 3.02); }
  };
  for (let i = 0; i < 192; i++) {
    const a = Math.PI * 2 * i / 192, b = Math.PI * 2 * (i + 1) / 192;
    const p = point(inner, a, front), q = point(outer, a, front), r = point(outer, b, front), s = point(inner, b, front);
    triangle(p, q, r, [0, 0, 1]); triangle(p, r, s, [0, 0, 1]);
    if (!solid) continue;
    const pb = point(inner, a, back), qb = point(outer, a, back), rb = point(outer, b, back), sb = point(inner, b, back);
    const radial = [Math.cos((a + b) / 2), Math.sin((a + b) / 2), 0];
    triangle(pb, rb, qb, [0, 0, -1]); triangle(pb, sb, rb, [0, 0, -1]);
    triangle(q, qb, rb, radial); triangle(q, rb, r, radial);
    triangle(p, sb, pb, radial.map(n => -n)); triangle(p, s, sb, radial.map(n => -n));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

export function musicDiscParts() {
  return [
    new THREE.Mesh(discAnnulus(.085, 1.57, .1, .055), new THREE.MeshPhysicalMaterial({name:'Music_Disc_Silver',color:0xb0b8bd,metalness:.82,roughness:.22,side:THREE.DoubleSide,clearcoat:.12})),
    new THREE.Mesh(discAnnulus(.23, 1.51, .105, .105, false), new THREE.MeshPhysicalMaterial({name:'Music_Disc_Print',color:0xe3e4db,metalness:0,roughness:.36,clearcoat:.12,clearcoatRoughness:.25,side:THREE.DoubleSide})),
    new THREE.Mesh(discAnnulus(.085, .23, .112, .055), new THREE.MeshPhysicalMaterial({name:'Music_Disc_Hub',color:0xf5f7f5,metalness:0,transmission:.65,thickness:.02,roughness:.13,side:THREE.DoubleSide,depthWrite:false})),
  ];
}
