import { Quaternion } from "../math/Quaternions.js";
import { Vec2 } from "../math/Vec2.js";
import { RigidBody } from "../RigidBody.js";
import { getCircleCollision, getOBBCollision, getContactPoint } from "./CollisionSystem.js";
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
    this.updateSpawning(dt);

    if(this.state.debug.rigidBodiesEnabled){
      this.updateRigidBodies(dt);
    }
    else{
      this.updateSimpleRotation(dt);
    }
  }

  updateSpawning(dt){
    if(this.state.asteroids.length >= this.state.maxAsteroids){
      this.state.asteroidSpawnTimer = 0;
      return;
    }

    this.state.asteroidSpawnTimer += dt;

    if(this.state.asteroidSpawnTimer < this.state.asteroidSpawnInterval){
      return;
    }

    this.state.asteroidSpawnTimer = 0;
    this.state.asteroidWarningTime = 2.2;
    this.state.asteroids.push(this.createAsteroidFromOutside());
  }

  createAsteroidFromOutside(){
    const width = this.randomRange(45, 80);
    const height = this.randomRange(35, 65);
    const mass = width * height * 0.01;
    const radius = Math.max(width, height) * 0.5;
    const bounds = this.state.getPlayableBounds(radius);
    const padding = radius + 20;
    const edge = Math.floor(Math.random() * 4);

    let position;
    if(edge === 0){
      position = new Vec2(-padding, this.randomRange(bounds.top, bounds.bottom));
    }
    else if(edge === 1){
      position = new Vec2(this.state.width + padding, this.randomRange(bounds.top, bounds.bottom));
    }
    else if(edge === 2){
      position = new Vec2(this.randomRange(radius, this.state.width - radius), -padding);
    }
    else{
      position = new Vec2(this.randomRange(radius, this.state.width - radius), this.state.height + padding);
    }

    const target = new Vec2(
      this.randomRange(radius, this.state.width - radius),
      this.randomRange(bounds.top, bounds.bottom)
    );
    const speed = this.randomRange(70, 150);
    const velocity = target.sub(position).normalized().scale(speed);

    const asteroid = new RigidBody({
      position,
      width,
      height,
      mass,
      velocity,
      angle: this.randomRange(0, Math.PI * 2),
      angularVelocity: this.randomRange(-2, 2),
      restitution: 0.85,
    });

    asteroid.wallCollisionEnabled = false;
    return asteroid;
  }

  randomRange(min, max){
    return Math.random() * (max - min) + min;
  }

  /**
   * simple asteroid animation (rotation only)
   * @param {number} dt 
   */
  updateSimpleRotation(dt){
    for(const asteroid of this.state.asteroids){
      if(asteroid.wallCollisionEnabled === false){
        asteroid.position = asteroid.position.add(asteroid.velocity.scale(dt));
        if(this.isBodyFullyInsideBounds(asteroid)){
          asteroid.wallCollisionEnabled = true;
        }
      }
      else{
        asteroid.velocity.x = 0;
        asteroid.velocity.y = 0;
      }
      asteroid.angle += asteroid.angularVelocity * dt;
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
      asteroid.useQuaternions = this.state.debug.useQuaternions;
      // integration updates position based on velocity and angle based on angular velocity
      asteroid.integrate(dt);
      this.handleWallCollision(asteroid);
    }
    // check for overlaps between asteroids after they have moved
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
    if(body.wallCollisionEnabled === false){
      if(this.isBodyFullyInsideBounds(body)){
        body.wallCollisionEnabled = true;
      }
      return;
    }

    const bounds = this.state.getPlayableBounds(body.radius);
    const vertices = body.getVertices();

    let minX = Infinity; 
    let maxX = -Infinity; 
    let minY = Infinity; 
    let maxY = -Infinity; 

    for(const v of vertices){
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }

    if(minX < 0){
      body.position.x += -minX;
      body.velocity.x *= -body.restitution;
      body.angularVelocity *= 0.98;
    }

    if(maxX > this.state.width){
      body.position.x -= maxX - this.state.width;
      body.velocity.x *= -body.restitution;
      body.angularVelocity *= 0.98;
    }

    if(minY < bounds.top){
      body.position.y += bounds.top - minY;
      body.velocity.y *= -body.restitution;
      body.angularVelocity *= 0.98;
    }

    if(maxY > bounds.bottom){
      body.position.y -= maxY - bounds.bottom;
      body.velocity.y *= -body.restitution;
      body.angularVelocity *= 0.98;
    }
  }

  isBodyFullyInsideBounds(body){
    const bounds = this.state.getPlayableBounds(body.radius);
    const vertices = body.getVertices();

    for(const v of vertices){
      if(v.x < 0 || v.x > this.state.width || v.y < bounds.top || v.y > bounds.bottom){
        return false;
      }
    }

    return true;
  }

  /**
   * Checks collisions between all asteroids pairs. 
   * Uses pairwise collision testing and resolves overlaps 
   * using an impulse-based response. 
   */
  handleAsteroidCollisions(){
    const asteroids = this.state.asteroids;
    for(let i = 0; i < asteroids.length; i++){
      for(let j = i + 1; j < asteroids.length; j++){
        const a = asteroids[i];
        const b = asteroids[j];

        let collisionData = null; 
        // use either simple circles or polygons depending on debug settings
        if(this.state.debug.useCircleColliders){
          collisionData = getCircleCollision(a, b);
        }
        else{
          collisionData = getOBBCollision(a, b);
        }
        // if collisionData is not null, the objects are overlapping
        if(collisionData){
          this.resolveCollisionWithData(a, b, collisionData, this.state);
        }
      }
    }
  }

  /**
   * The core physics solver. Pushes overlapping bodies apart and calculates 
   * the exact forces needed to make them bounce realistically.
   */
  resolveCollisionWithData(a, b, collisionData, state){
    const normal = collisionData.normal; // the direction of the impact
    const penetration = collisionData.penetration; // how deep they are stuck inside each other

    const totalInvMass = a.invMass + b.invMass;
    if(totalInvMass === 0) return; 

    // Positional correction
    // Floating point errors cause objects to slowly sink into each other. 
    // This physically separates them based on their mass ration before applying physics.
    const correction = normal.scale(penetration / totalInvMass);

    a.position = a.position.add(correction.scale(a.invMass));
    b.position = b.position.sub(correction.scale(b.invMass));

    // Calculate contact point based on active toggle (world space)
    let contactPoint; 
    if(state.debug.useCircleColliders){
      contactPoint = a.position.add(normal.scale(a.radius));
    }
    else{
      contactPoint = getContactPoint(a, b, normal);
    }

    // vectors pointing from the center of mass to the point of impact
    const ra = contactPoint.sub(a.position);
    const rb = contactPoint.sub(b.position);
    const wA = a.angularVelocity || 0; 
    const wB = b.angularVelocity || 0; 
    // a point on a spinning object moves faster than its center. 
    // we add linear velocity and rotational velocity together to get the absolute speed.
    const va = a.velocity.add(this.crossScalarVec(wA, ra));
    const vb = b.velocity.add(this.crossScalarVec(wB, rb));

    const relativeVelocity = va.sub(vb); // how fast object a is moving relative to object b
    // how much of that velocity is pushing directly into the other object (dot product)
    const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y; 

    // if velocityAlongNormal is positive, they are already moving apart -> do nothing
    if(velocityAlongNormal > 0) return; 
    const impactSpeed = Math.abs(velocityAlongNormal);
    if(impactSpeed > 10 && this.state.debug.enableSound){
      const dynamicVolume = Math.max(0.8, impactSpeed / 250);
      this.state.audio.playSound("asteroid_hit", {volume: dynamicVolume, pitchVariation: 0.4});
    }

    // choose the lowest bounciness of both objects
    const restA = a.restitution !== undefined ? a.restitution : 0.8;
    const restB = b.restitution !== undefined ? b.restitution : 0.8;
    const restitution = Math.min(restA, restB);
    // calculate how much the impacht point resists rotation (torque resistance)
    const raCrossN = this.crossVecVec(ra, normal);
    const rbCrossN = this.crossVecVec(rb, normal);
    // the denominator of the impulse equation. Accounts for both mass and rotational inertia
    const denominator = a.invMass + b.invMass + (raCrossN * raCrossN * (a.invInertia || 0)) + (rbCrossN * rbCrossN * (b.invInertia || 0));

    if(denominator === 0) return; 

    // j is scalar magnitude of the physics impulse. 
    // it scales based on relative speed and restitution.
    const j = -(1 + restitution) * velocityAlongNormal / denominator; 
    const impulse = normal.scale(j);

    // apply linear impulse 
    a.velocity = a.velocity.add(impulse.scale(a.invMass));
    b.velocity = b.velocity.sub(impulse.scale(b.invMass));

    // apply angular impulse 
    // hitting the ede of an object causes more spin that hitting the center.
    a.angularVelocity += this.crossVecVec(ra, impulse) * (a.invInertia || 0);
    b.angularVelocity -= this.crossVecVec(rb, impulse) * (b.invInertia || 0);
  }

  /**
   * 2D cross product (Vector x Vector)
   * @returns a scalar representing the magnitude of torque
   */
  crossVecVec(a, b){
    return a.x * b.y - a.y * b.x;
  }

  /**
   * 2D cross product (Scalar x Vector)
   * used to calculate the tangential velocity vector of a spinning object
   */
  crossScalarVec(s, v){
    return new Vec2(-s * v.y, s* v.x);
  }
}
