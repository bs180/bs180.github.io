import { Vec2 } from "./math/Vec2.js";
/**
 * Catmull-Rom Spline for path interpolation. 
 * The spline is defined by control points and allows sampling positions 
 * along a smooth curve using a parameter t in [0, 1].
 * In this game, it is used to move the nitro pickup along a smooth path. 
 */
export class CatmullRomSpline{
  constructor(controlPoints = []){
    this.controlPoints = controlPoints;
    this.points = [];

    this.arcLengthTable = [];
    this.totalLength = 0;
    this.arcLengthSampleCount = 500;

    this.rebuild();
  }

  /**Replace control points and rebuild spline */
  setControlPoints(points){
    this.controlPoints = points;
    this.rebuild();
  }

  /**Returns the original control points */
  getControlPoints(){
    return this.controlPoints;
  }

  /**Returns internal spline points (including duplicated endpoints) */
  getSplinePoints(){
    return this.points; 
  }

  getArcLengthTable(){
    return this.arcLengthTable || [];
  }

  /**Helper: random number in range [min, max] */
  randomRange(min, max){
    // Source: https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
    return Math.random() * (max - min) +  min; 
  }

  /**
   * Computes a point on a specific spline segment 
   * Uses 4 neighboring points (p0, p1, p2, p3) to calculate a smooth interpolated position
   */
  getSegmentPoint(segmentIndex, t){
    const p0 = this.points[segmentIndex];
    const p1 = this.points[segmentIndex + 1];
    const p2 = this.points[segmentIndex + 2];
    const p3 = this.points[segmentIndex + 3];

    const t2 = t * t;
    const t3 = t2 * t;

    // Catmull-Rom spline formula
    // Source: https://www.mvps.org/directx/articles/catmull/
    const x = 0.5 * ((2 * p1.x) + 
                     (-p0.x + p2.x) * t + 
                     (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                     (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

    const y = 0.5 * ((2 * p1.y) + 
                     (-p0.y + p2.y) * t + 
                     (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                     (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

    return new Vec2(x,y);
  }

  /**
   * Generates random control points within the canvas. 
   * Poitns are sorted along x-axis to avoid chaotic zig-zag paths. 
   */
  generateRandomControlPoints(width, height, pointCount = 5, margin = 80){
    this.controlPoints = [];
    for(let i = 0; i < pointCount; i++){
      this.controlPoints.push(new Vec2(this.randomRange(margin, width - margin), this.randomRange(margin, height - margin)));
    }
    // How to sort an array in JS (ascending) -> Source: https://www.w3schools.com/jsref/jsref_sort.asp (Using a Sort Function)
    this.controlPoints.sort((a,b) => a.x - b.x); //sort controlPoints in x direction such that no weird zig-zag paths occur
    this.rebuild();
    return this.controlPoints; 
  }

  /**
   * Prepares spline points. 
   * Duplicates first and last control point so that the spline starts and ends correctly. 
   */
  rebuild(){
    if(this.controlPoints.length < 2){
      this.points = [];
      this.arcLengthTable = [];
      this.totalLength = 0;
      return; 
    }
    const first = this.controlPoints[0];
    const last = this.controlPoints[this.controlPoints.length - 1];

    // duplicate endpoints for correct boundary interpolation
    // A Catmull-Rom spline always needs 4 points to compuet one segment [p0, p1, p2, p3]
    // But the control points look like this [p1, p2, p3, p4, ...]. At the start we want a 
    // segment form p1 -> p2 but we need [p0, p1, p2, p3], but p0 does not exist. Same for 
    // the endpoint. So therefore we "fake" the missing points and the array becomes: 
    // this.points = [first, ...this.controlPoints, last]; // with this we get tighter points 
    const firstGhost = this.controlPoints[0].clone().sub(this.controlPoints[1].clone().sub(this.controlPoints[0]));
    const lastGhost = this.controlPoints[this.controlPoints.length - 1].clone().add(this.controlPoints[this.controlPoints.length - 1].clone().sub(this.controlPoints[this.controlPoints.length - 2]));
    this.points = [firstGhost, ...this.controlPoints, lastGhost];
    this.rebuildArcLengthTable(this.arcLengthSampleCount);
  }

  /**
   * Samples the arc-length-parameterized spline into multiple points. 
   * This is mainly used for rendering the visible spline curve. 
   * @returns {Vec2[]} Array of sampled spline points
   */
  sample(sampleCount = 100){
    const samples = [];
    for(let i = 0; i <= sampleCount; i++){
      const t = i / sampleCount; 
      samples.push(this.getPoint(t))
    }
    return samples;
  }

  /**
   * Samples the raw spline parameter without arc-length correction. 
   * This is useful for debugging because it shows the difference between 
   * direct parameter traversal and arc-length-parameterized traversal. 
   * @param {number} sampleCount 
   * @returns {Vec2[]} Array of sampled raw spline points
   */
  sampleRaw(sampleCount = 100){
    const samples = [];
    for(let i = 0; i <= sampleCount; i++){
      const t = i / sampleCount; 
      samples.push(this.getPointRaw(t))
    }
    return samples;
  }

  /**
   * Returns a point on the spline for global parameter t in [0, 1]. 
   * Maps t to the correct segment and computes the local interpolation. 
   * Reference for similar segment-based evaluation: https://codepen.io/ndesmic/pen/vYyGbeJ 
   */
  getPointRaw(t){
    if(this.points.length < 4){
      throw new Error("CatmullRomSpline needs at least 4 control points.");
    }
    t = Math.max(0, Math.min(1, t)); // clamp to valid range

    const segmentCount = this.points.length - 3; 
    const scaledT = t * segmentCount; // map the global parameter to a specific spline segment
    const segmentIndex = Math.min(Math.floor(scaledT), segmentCount - 1); // determine the segment index 
    const localT = scaledT - segmentIndex; // local interpolation within that segment
    return this.getSegmentPoint(segmentIndex, localT);
  }

  /**
   * Builds the arc-length lookup table for the spline. 
   * The spline is sampled at regular parameter intervals. The distances 
   * between neighboring samples are accumulated to approximate the total 
   * curve length. The table is later used to map normalized arc length 
   * values back to raw spline parameters. 
   */
  rebuildArcLengthTable(sampleCount = 500){
    this.arcLengthTable = [];
    this.totalLength = 0;

    if(this.points.length < 4) return; 

    let previousPoint = this.getPointRaw(0); // start measuring the curve length at the beginning of the spline 

    // store the first table entry with zero accumulated length
    this.arcLengthTable.push({
      t: 0, 
      length: 0, 
      normalizedLength: 0, 
      point: previousPoint.clone(),
    });

    for(let i = 1; i <= sampleCount; i++){
      const t = i / sampleCount; 
      const point = this.getPointRaw(t);

      const segmentLength = point.distanceTo(previousPoint); // approx. the curve length by summing distances between neighboring samples
      this.totalLength += segmentLength; 

      this.arcLengthTable.push({
        t, 
        length: this.totalLength,
        normalizedLength: 0, 
        point: point.clone(),
      });
      previousPoint = point;
    }
    // normalize accumulated lengths to the range [0, 1]
    for(const entry of this.arcLengthTable){
      entry.normalizedLength = this.totalLength > 0 ? entry.length / this.totalLength : 0;
    }
  }

  /**
   * Converts a normalized arc-length value to a raw spline parameter. 
   * The input u represents the desired normalized distance along the curve. 
   * The lookup table is searched for the two surroudning samples and linear 
   * interpolation is used to estimate the corresponding raw spline parameter t. 
   * @param {number} u - Normalized arc-length value in [0, 1]
   */
  getTForArcLength(u){
    // rebuild the lookup table if it is missing
    if(!this.arcLengthTable || this.arcLengthTable.length === 0){
      this.rebuildArcLengthTable(this.arcLengthSampleCount);
    }
    u = Math.max(0, Math.min(1, u)); // clamp to valid normalized arc-length range

    // find the first table interval whose normalized length contains u 
    for(let i = 1; i < this.arcLengthTable.length; i++){
      const prev = this.arcLengthTable[i - 1];
      const next = this.arcLengthTable[i];
      if(u <= next.normalizedLength){
        const range = next.normalizedLength - prev.normalizedLength;
        const alpha = range > 0 ? (u - prev.normalizedLength) / range : 0; // interpolate between the two neighboring table entries
        return prev.t + (next.t - prev.t) * alpha; 
      }
    } 
    return 1;
  }

  /**
   * Evalueates the spline using arc-length parameterization. 
   * The normalized arc-length parameter u is first converted into a corrected 
   * raw spline parameter. This produces approx. constant movement speed along 
   * the curve. 
   */
  getPointByArcLength(u){
    const correctedT = this.getTForArcLength(u);
    return this.getPointRaw(correctedT);
  }

  /**
   * Returns a point on the spline using arc-length parameterization 
   * This is the default spline evaluation method used by the gameplay system. 
   * @param {number} u 
   * @returns {Vec2} Position on the spline
   */
  getPoint(u){
    return this.getPointByArcLength(u);
  }

  /**
   * Applies an ease-in/ease-out functino to a normalized traversal value. 
   * The interval [0, 1] is divided into three parts: 
   * acceleration, constant-speed motion and deceleration. This creates 
   * non-constant traversal speed while still starting at 0 and ending at 1.
   * @param {number} t 
   * @param {number} k1 
   * @param {number} k2 
   * @returns {number} eased traversal value in [0, 1]
   */
  ease(t, k1 = 0.25, k2 = 0.75){
    t = Math.max(0, Math.min(1, t));
    const f = k1 * 2 / Math.PI + (k2 - k1) + (1 - k2) * 2 / Math.PI; 
    let s; 

    if(t < k1){
      s = k1 * (2 / Math.PI) * (Math.sin((t / k1) * Math.PI / 2 - Math.PI / 2) + 1);
    }
    else if(t < k2){
      s = 2 * k1 / Math.PI + (t - k1);
    }
    else{
      s = 2 * k1 / Math.PI + (k2 - k1) + (1 - k2) * (2 / Math.PI) * Math.sin(((t - k2) / (1 - k2)) * Math.PI / 2);
    }
    return s / f;
  }
}