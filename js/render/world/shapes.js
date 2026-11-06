/*
✒ Metadata
    - Title: World Shapes (digiSpace Edition - v2.1)
    - File Name: shapes.js
    - Relative Path: js/render/world/shapes.js
    - Artifact Type: javascript
    - Version: 2.1.0
    - Date: 11/06/2026
    - Update: Friday, November 06, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.1.0 (11/06/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for the 3D mode: bevelled geometry for the apparatus.
    Earlier entries: see CHANGELOG.md

✒ Description:
    Small builders for the geometry apparatus is made of. Real objects have no
    knife edges, so every helper here rounds or chamfers what it makes; a
    bevel is what catches the highlights that read as solid metal and wood.

✒ Key Features:
    - roundedBox: a box with rolled edges.
    - turned: a lathe profile smoothed through its control points.
    - ringFrame: a rounded-rectangle frame with a bevelled section.
    - rod: a rod between two points, for arms and struts.
    - bolt: a domed hex-socket screw head.

✒ Other Important Information:
    - Dependencies: three@0.187.0 from jsDelivr via the import map
    - Compatible platforms: Evergreen browsers with ES modules, import maps
      and container queries (Chrome and Edge 105+, Firefox 110+, Safari
      16.4+)
---------
*/
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const roundedBox = (w, h, d, r = 0.04, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));

/* A body of revolution around Y. profile is [[radius, height], …]; the lathe needs it bottom to top for outward normals. */
export function turned(profile, seg = 48, smooth = 8) {
  if (profile[0][1] > profile[profile.length - 1][1]) profile = [...profile].reverse();
  const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = curve.getPoints(profile.length * smooth).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  const g = new THREE.LatheGeometry(pts, seg);
  g.computeVertexNormals();
  return g;
}

function roundedRectPath(path, w, h, r) {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y); path.lineTo(x + w - r, y); path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + h - r); path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + h); path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r); path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}
/* A flat frame around an opening w × h, facing +Z, with bevelled edges; band is the rail width. */
export function ringFrame(w, h, band, depth, corner = 0.12, bevel = 0.02) {
  const s = roundedRectPath(new THREE.Shape(), w + 2 * band, h + 2 * band, corner + band);
  s.holes.push(roundedRectPath(new THREE.Path(), w, h, corner));
  const g = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 12 });
  g.translate(0, 0, -depth / 2 + bevel);
  return g;
}

/* A unit cylinder to stretch between two points with rodMatrix; whatever it joins hides its ends. */
export const rodGeometry = (seg = 16) => new THREE.CylinderGeometry(1, 1, 1, seg);
const UP = new THREE.Vector3(0, 1, 0), mid = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), m = new THREE.Matrix4();
/* Write a rod's matrix so it spans a to b with radius `thick`. */
export function rodMatrix(ax, ay, az, bx, by, bz, out = m, thick = 1) {
  mid.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); dir.set(bx - ax, by - ay, bz - az);
  const len = dir.length() || 1e-6;
  q.setFromUnitVectors(UP, dir.divideScalar(len)); s.set(thick, len, thick);
  return out.compose(mid, q, s);
}

export function bolt(radius = 0.05) {
  const g = turned([[0, radius * 0.5], [radius * 0.82, radius * 0.46], [radius, radius * 0.22], [radius * 1.02, 0], [radius * 1.02, -0.002]], 18, 5);
  return g;
}
