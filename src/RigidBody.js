import { Vec2 } from "./math/Vec2.js";
/**
 * Simple rigid-body representation used for 
 * physics-based asteroid simulation. 
 * The rigid body stores linear and angular 
 * physical properties and supports force-based 
 * integration using explicit Euler integration. 
 */
export class RigidBody{
  constructor({
    position, 
    radius = 20, 
    mass = 1, 
    velocity = new Vec2(), 
    angle = 0,
    angularVelocity = 0, 
    restitution = 0.8,
  }){
    this.position = position; 
    this.radius = radius; 

    this.mass = mass;

    this.velocity = velocity; 
    this.force = new Vec2();

    this.angle = angle; 
    this.angularVelocity = angularVelocity; 
    this.torque = 0; 

    this.inertia = 0.5 * mass * radius * radius; 

    this.restitution = restitution; 
  }

  /**
   * Applies a linear force to the rigid body. 
   * The force is accumulated until the next integration step. 
   * @param {Vec2} force 
   */
  applyForce(force){
    this.force = this.force.add(force);
  }

  /**
   * Applies a force at a specific world-space point. 
   * This produces linear acceleration and rotational torque. 
   * Torque is computed using the 2D cross product. 
   * @param {Vec2} force 
   * @param {Vec2} point 
   */
  applyForceAtPoint(force, point){
    this.applyForce(force);
    const r = point.sub(this.position);
    this.torque += r.x * force.y - r.y * force.x;
  }

  /**
   * Integrates rigid body motion using explicit Euler integration. 
   * updates linear velocity, linear position, angular velocity and 
   * rotation angle. 
   * @param {number} dt 
   */
  integrate(dt){
    const acceleration = this.force.scale(1 / this.mass); // Newton's second law: F = m * a -> a = F / m
    this.velocity = this.velocity.add(acceleration.scale(dt)); // integrate velocity 
    this.position = this.position.add(this.velocity.scale(dt)); // integrate position 

    const angularAcceleration = this.torque / this.inertia; // alpha = torque / inertia

    this.angularVelocity += angularAcceleration * dt; // integrate angular velocity 
    this.angle += this.angularVelocity * dt; // integrate orientation angle 

    this.force = new Vec2();
    this.torque = 0; 
  }
}