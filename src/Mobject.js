import * as THREE from "three";
import { MeshLine, MeshLineMaterial } from "threejs-meshline";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MobjectFillBufferGeometry } from "./MobjectFillBufferGeometry.js";
import * as utils from "./utils";

const DEFAULT_STYLE = {
  strokeColor: 0xffffff,
  strokeOpacity: 1,
  fillColor: 0x000000,
  fillOpacity: 1,
  strokeWidth: 4,
};

const STROKE_SHRINK_FACTOR = 100;

class Mobject extends THREE.Group {
  constructor(id, points, style) {
    super();
    this.mobjectId = id;
    this.style = Object.assign(DEFAULT_STYLE, style);
    this.shapes = this.computeShapes(points);
    this.fillMesh = new THREE.Mesh(
      this.computeFillGeometry(),
      this.computeFillMaterial()
    );
    this.strokeMesh = new THREE.Mesh(
      this.computeStrokeGeometry(),
      this.computeStrokeMaterial()
    );
    this.add(this.fillMesh);
    this.add(this.strokeMesh);
  }

  update(points, style, needsRedraw) {
    if (needsRedraw) {
      this.shapes = this.computeShapes(points);

      // If a material is currently invisible and will continue to be invisible
      // on the next frame, skip updating the corresponding geometry.
      if (!(this.style.fillOpacity === 0 && style.fillOpacity === 0)) {
        this.updateFillGeometry();
      }
      if (!(this.style.strokeOpacity === 0 && style.strokeOpacity === 0)) {
        // TODO: Update this rather than destroying and recreating it.
        this.strokeMesh.geometry.dispose();
        this.strokeMesh.geometry = this.computeStrokeGeometry();
      }
    }

    this.style = Object.assign(this.style, style);
    this.updateFillMaterial();
    this.updateStrokeMaterial();
  }

  dispose() {
    this.fillMesh.geometry.dispose();
    this.fillMesh.material.dispose();
    this.strokeMesh.geometry.dispose();
    this.strokeMesh.material.dispose();
  }

  computeShapes(points) {
    let shapes = [];
    let paths = [];
    let path;
    let move = true;
    for (let i = 0; i < points.length / 4; i++) {
      let curveStartIndex = 4 * i;
      if (move) {
        path = new THREE.Path();
        path.moveTo(points[curveStartIndex][0], points[curveStartIndex][1]);
      }
      path.bezierCurveTo(
        points[curveStartIndex + 1][0],
        points[curveStartIndex + 1][1],
        points[curveStartIndex + 2][0],
        points[curveStartIndex + 2][1],
        points[curveStartIndex + 3][0],
        points[curveStartIndex + 3][1]
      );

      move = curveStartIndex + 4 === points.length;
      if (!move) {
        let lastPoint = points[curveStartIndex + 3];
        let nextPoint = points[curveStartIndex + 4];
        move = !utils.allClose(lastPoint, nextPoint);
      }
      if (move) {
        paths.push(path);
      }
    }

    // Determine paths and shapes.
    let decided_path_indices = new Set();
    for (let i = 0; i < paths.length; i++) {
      if (decided_path_indices.has(i)) {
        continue;
      }
      let test_shape = paths[i];
      let known_shape = null;
      for (let j = 0; j < paths.length; j++) {
        if (i === j || decided_path_indices.has(j)) {
          continue;
        }
        let test_hole = paths[j];
        let shapeContainsHole = utils.isPointInsidePolygon(
          test_hole.getPoint(0),
          test_shape.getPoints()
        );
        if (shapeContainsHole) {
          // Assume the outer path is a shape and the inner path is a hole.
          if (known_shape === null) {
            let shape = new THREE.Shape();
            shape.curves.push(...test_shape.curves);
            shape.holes.push(test_hole);
            known_shape = shape;
            decided_path_indices.add(i);
            decided_path_indices.add(j);
          } else {
            known_shape.holes.push(test_hole);
            decided_path_indices.add(j);
          }
        }
      }
      if (known_shape !== null) {
        shapes.push(known_shape);
      }
    }
    // The path isn't contained by any other path and doesn't contain any other path.
    // Assume it's a shape.
    for (let i = 0; i < paths.length && !decided_path_indices.has(i); i++) {
      let shape = new THREE.Shape();
      shape.curves.push(...paths[i].curves);
      shapes.push(shape);
    }
    return shapes;
  }

  createMeshLineGeometries(shape) {
    let extractedPoints = shape.extractPoints();
    let meshLineGeometries = [];
    for (let vecList of [extractedPoints.shape, ...extractedPoints.holes]) {
      let geometry = new THREE.Geometry();
      for (let i = 0; i < vecList.length; i++) {
        let point = vecList[i];
        geometry.vertices.push(new THREE.Vector3(point.x, point.y, 0));
      }
      let meshLine = new MeshLine();
      meshLine.setGeometry(geometry);
      meshLineGeometries.push(meshLine.geometry);
    }
    let fullGeometry = BufferGeometryUtils.mergeBufferGeometries(
      meshLineGeometries
    );
    return fullGeometry;
  }

  computeStrokeGeometry() {
    let geometries = [];
    for (let shape of this.shapes) {
      geometries.push(this.createMeshLineGeometries(shape));
    }
    return BufferGeometryUtils.mergeBufferGeometries(geometries);
  }

  computeStrokeMaterial() {
    let { strokeOpacity, strokeColor, strokeWidth } = this.style;
    return new MeshLineMaterial({
      color: new THREE.Color(strokeColor),
      opacity: strokeOpacity,
      transparent: true,
      lineWidth: strokeWidth / STROKE_SHRINK_FACTOR,
    });
  }

  updateStrokeMaterial() {
    let { strokeColor, strokeOpacity, strokeWidth } = this.style;
    this.strokeMesh.material.color.set(strokeColor);
    this.strokeMesh.material.opacity = strokeOpacity;
    this.strokeMesh.material.lineWidth = strokeWidth / STROKE_SHRINK_FACTOR;
  }

  computeFillGeometry() {
    return new MobjectFillBufferGeometry(this.shapes, 11);
  }

  updateFillGeometry() {
    this.fillMesh.geometry.update(this.shapes);
  }

  computeFillMaterial() {
    let { fillOpacity, fillColor } = this.style;
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(fillColor),
      opacity: fillOpacity,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  updateFillMaterial() {
    let { fillColor, fillOpacity } = this.style;
    this.fillMesh.material.color.set(fillColor);
    this.fillMesh.material.opacity = fillOpacity;
  }
}

export { Mobject };
