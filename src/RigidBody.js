import { Quaternion } from "./math/Quaternions.js";
import { Vec2} from "./math/Vec2.js";
/**
 * This class represents a solid, physical object that cannot deform.
 * It handles both linear motion and angular motion. 
 */
export class RigidBody{
  constructor({
    position, 
    width = 60, 
    height = 40,
    mass = 1, 
    velocity = new Vec2(), 
    angle = 0,
    angularVelocity = 0, 
    restitution = 0.8,
  }){
    this.position = position; 
    this.width = width; 
    this.height = height;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;

    this.radius = Math.max(width, height) * 0.5;

    this.mass = mass;
    // use inverse mass to make math faster (mult faster than div) and it allows us 
    // to easily create unmovable objects like walls. Infinte mass -> inverse mass = 0 -> 
    // any force multiplied with 0 is 0
    this.invMass = mass > 0 ? 1 / mass : 0;

    this.velocity = velocity; 
    this.force = new Vec2();

    this.angle = angle; 
    this.orientation = Quaternion.fromEulerToQuaternion(0, 0, this.angle);
    this.angularVelocity = angularVelocity; 
    this.torque = 0; 

    // inertia tensor for a 2D rectangle
    this.inertia = (mass * (width * width + height * height)) / 12;
    this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0; 

    this.restitution = restitution; 

    // used for verlet integration (tracking previous frame's momentum)
    this.previousAcceleration = new Vec2(0, 0);
    this.previousAngularAcceleration = 0;
  }

  /**
   * Pushes the object from its center point (affects only linear speed)
   * @param {Vec2} force 
   */
  applyForce(force){
    this.force = this.force.add(force);
  }

  /**
   * Pushes the object at a specific off-center coordinate
   * This generates both linear movement and rotational spin
   * @param {Vec2} force 
   * @param {Vec2} point 
   */
  applyForceAtPoint(force, point){
    this.applyForce(force);
    const r = point.sub(this.position); // distance from center of mas to impact point (lever arm)
    // 2D cross product: calculates exactly how much of the force is pushing perpendicular to 
    // the lever arm, creating spin
    this.torque += r.x * force.y - r.y * force.x;
  }

  // Newton's Second Law: Force = Mass * Acceleration
  getAcceleration(){
    return this.force.scale(this.invMass);
  }

  // Rotational equivalent of Newton's Second Law
  getAngularAcceleration(){
    return this.torque * this.invInertia;
  }

  /**
   * Velocity Verlet-style integration
   * Integration is the math of moving objects forward in time. 
   * Velocity-Verlet looks at both the current acceleration and the previous 
   * frame's acceleration to create a smooth and stable physics curve.
   * @param {number} dt 
   */
  integrate(dt){
    const acceleration = this.getAcceleration();
    const angularAcceleration = this.getAngularAcceleration();
    // Step 1: update position using current velocity and half the new acceleration
    this.position = this.position.add(this.velocity.scale(dt)).add(acceleration.scale(0.5 * dt * dt));
    // this.angle += this.angularVelocity * dt + 0.5 * angularAcceleration * dt * dt;
    // Step 2: update velocity by averaging the previous and current accelerations
    this.velocity = this.velocity.add(this.previousAcceleration.add(acceleration).scale(0.5 * dt));
    this.angularVelocity += 0.5 * (this.previousAngularAcceleration + angularAcceleration) * dt;
    // calculate how many radians we rotated this exact frame
    const deltaAngle = this.angularVelocity * dt + 0.5 * angularAcceleration * dt * dt;

    if(this.useQuaternions && this.orientation){
      // convert that movement inot a delta quaternion
      const deltaQuaternion = Quaternion.fromEulerToQuaternion(deltaAngle);
      // multiply the current orientation by the delta (multiplication = rotation in quaternions)
      this.orientation = this.orientation.multiply(deltaQuaternion).normalize();
      // extract the standard radian angle back out. 
      // by keeping this.angle we guarantee that CollisionSystem.js and Renderer.js don't crash
      this.angle = this.orientation.getEulerFromQuaternion();
    }
    else this.angle += deltaAngle;
    
    // Step 3: save state for next frame 
    this.previousAcceleration = acceleration; 
    this.previousAngularAcceleration = angularAcceleration;
    // Step 4: clear forces so they don't accumulate forever
    this.force = new Vec2();
    this.torque = 0;
  }

  /**
   * Applies a 2D rotation matrix to find the absolute world-coordinates
   * of the 4 corners of this rectangular body
   */
  getVertices(){
    let cos, sin; 

    if(this.useQuaternions && this.orientation){
      const q = this.orientation;
      cos = (q.w * q.w) - (q.z * q.z);
      sin = 2 * q.w * q.z;
    }
    else{
      cos = Math.cos(this.angle);
      sin = Math.sin(this.angle);
    }

    // corners if the object was sitting at 0,0
    const localVertices = [
      new Vec2(-this.halfWidth, -this.halfHeight), // top-left
      new Vec2(this.halfWidth, -this.halfHeight), // top-right
      new Vec2(this.halfWidth, this.halfHeight), // bottom-right
      new Vec2(-this.halfWidth, this.halfHeight), // bottom-left
    ];
    // spint them and move them to their actual world position
    // since there are 4 corners, the callback runs 4 times (.map())
    return localVertices.map(v => new Vec2(
      this.position.x + v.x * cos - v.y * sin,
      this.position.y + v.x * sin + v.y * cos
    ));
  }

  getMomentum(){
    return this.velocity.scale(this.mass); // p = m * v
  }

  getAngularMomentum(){
    return this.inertia * this.angularVelocity; // L = I * w
  }
}