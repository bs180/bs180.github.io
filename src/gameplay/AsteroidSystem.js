import { Vec2 } from "../math/Vec2.js";
import { RigidBody } from "../RigidBody.js";
/**
 * Handles asteroid animation, rigid body updates, 
 * wall collisions and asteroid-asteroid collision response. 
 * The system supports two modes: 
 * 1. simple visual rotation 
 * 2. impulse-based rigid body dynamics
 */
export class AsteroidSystem{
  constructor(state){
    this.state = state;
  }

  /**
   * Main asteroid update function. 
   * Depending on the current debug mode, 
   * either simple rotation or rigid body simulation is used. 
   * @param {number} dt 
   */
  update(dt){
    if(this.state.debug.rigidBodiesEnabled){
      this.updateRigidBodies(dt);
    }
    else{
      this.updateSimpleRotation(dt);
    }
  }

  /**
   * simple asteroid animation (rotation only)
   * @param {number} dt 
   */
  updateSimpleRotation(dt){
    for(const asteroid of this.state.asteroids){
      asteroid.rotation += asteroid.rotationSpeed * dt;
    }
  }

  /**
   * updates rigid body asteroid simulation. 
   * Performs rigid body integration, wall collision handling 
   * and asteroid-asteroid collision response. 
   * @param {number} dt 
   */
  updateRigidBodies(dt){
    for(const asteroid of this.state.asteroids){
      asteroid.integrate(dt);
      this.handleWallCollision(asteroid);
    }
    this.handleAsteroidCollisions();
  }

  /**
   * Handles collisions between a rigid body and the scene 
   * boundaries. 
   * Velocity is reflected using the restitution coefficient 
   * to simulate bouncing behavior. 
   * @param {RigidBody} body 
   */
  handleWallCollision(body){
    const bounds = this.state.getPlayableBounds(body.radius);

    if(body.position.x - body.radius < 0){
      body.position.x = body.radius; 
      body.velocity.x *= - body.restitution;
    }
    if(body.position.x + body.radius > this.state.width){
      body.position.x = this.state.width - body.radius;
      body.velocity.x *= - body.restitution;
    }
    if(body.position.y - body.radius < bounds.top){
      body.position.y = bounds.top + body.radius; 
      body.velocity.y *= - body.restitution;
    }
    if(body.position.y + body.radius > bounds.bottom){
      body.position.y = bounds.bottom - body.radius;
      body.velocity.y *= - body.restitution;
    }
  }

  /**
   * Checks collisions between all asteroids pairs. 
   * Uses pairwise collision testing and resolves collisions 
   * using impulse-based response. 
   */
  handleAsteroidCollisions(){
    const asteroids = this.state.asteroids;
    for(let i = 0; i < asteroids.length; i++){
      for(let j = i + 1; j < asteroids.length; j++){
        this.resolveCircleCollision(asteroids[i], asteroids[j]);
      }
    }
  }

  /**
   * Resolves collision between two circular rigid bodies. 
   * The collision response consists of: 
   * 1. penetration correction 
   * 2. relative velocity computation 
   * 3. impulse calculation 
   * 4. velocity update 
   * 5. angular velocity update 
   * 
   * @param {RigidBody} a 
   * @param {RigidBody} b 
   * @returns 
   */
  resolveCircleCollision(a, b){
    const delta = a.position.sub(b.position); // vector between both asteroid centers
    const distance = delta.length(); // current distance between asteroid centers

    if(distance === 0) return; 

    const penetration = a.radius + b.radius - distance; // penetration depth between both collision circles

    if(penetration <= 0) return; // no collision if negative

    const normal = delta.scale(1 / distance); // normalized collision normal vector
    const totalInvMass = 1 / a.mass + 1 / b.mass; // total inverse mass used for impulse computation
    if(totalInvMass === 0) return; 

    // Penetration correction. Separate both bodies proportionally to their masses to prevent interpenetration
    const correction = normal.scale(penetration / totalInvMass); 
    a.position = a.position.add(correction.scale(1 / a.mass));
    b.position = b.position.sub(correction.scale(1 / b.mass));

    const relativeVelocity = a.velocity.sub(b.velocity); // relative vel between both rigid bodies
    const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y; // project relative vel onto collision normal 

    if(velocityAlongNormal > 0) return; 

    const restitution = Math.min(a.restitution, b.restitution); // restitution controls elasticity of the collision 

    // Impulse-based collision: 
    // j = -(1 + e)(v_rel * n) / (invMassA + invMassB)
    const impulseScale = 1;
    const j = impulseScale * (-(1 + restitution) * velocityAlongNormal / totalInvMass); 
    const impulse = normal.scale(j); // collision impules vector
    
    // apply collision impulse to both bodies
    a.velocity = a.velocity.add(impulse.scale(1 / a.mass)); 
    b.velocity = b.velocity.sub(impulse.scale(1 / b.mass));

    // small rotational response after impact
    a.angularVelocity += 0.02 * j / a.inertia; 
    b.angularVelocity += 0.02 * j / b.inertia;
  }
}
