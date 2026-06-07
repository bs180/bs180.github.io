import { Vec2 } from "../math/Vec2.js";
import { isColliding, getOBBCollision, getContactPoint, getCircleCollision} from "./CollisionSystem.js";
/**
 * Handles all player-related gameplay logic. 
 * This includes movement, shooting, fuel consumption, 
 * collisions and bullet updates. 
 */
export class PlayerSystem{
  constructor(state){
    this.state = state; 
  }

  /**
   * Updates all player systems once per simulation step 
   * Order matters, we  must move the player before checking if they hit an asteroid.
   * @param {number} dt 
   * @param {Input} input 
   */
  update(dt, input){
    this.updateCooldowns(dt);
    this.updateMovement(dt, input);
    this.updateFuel(dt);
    this.updateShooting(dt, input);
    this.updateBullets(dt);
    this.checkAsteroidCollision();
    this.checkPlayerBulletAsteroidCollision();
    this.keepInsideBounds();
  }

  /**
   * Updates cooldowns
   * @param {number} dt 
   */
  updateCooldowns(dt){
    const player = this.state.player; 
    player.hitCooldown = Math.max(0, player.hitCooldown - dt);
    player.healthFlashTime = Math.max(0, player.healthFlashTime - dt);
    player.pickupVisualTime = Math.max(0, player.pickupVisualTime - dt);
    player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  } 

  /**
   * Updates frame-rate independent player movement. 
   * Keyboard input is converted inot a normalized movement vector. 
   * Nitro temporarily increases the movement speed. 
   * @param {number} dt 
   * @param {Input} input 
   * @returns 
   */
  updateMovement(dt, input){
    if(this.state.paused) return; 
    const player = this.state.player; 
    let move = new Vec2(0, 0);

    player.old_position.copy(player.position); //store the previous position for motion blur rendering
    player.nitroActive = false;

    if(input.isKeyDown("w")) move.y -= 1;
    if(input.isKeyDown("s")) move.y += 1;
    if(input.isKeyDown("a")) move.x -= 1;
    if(input.isKeyDown("d")) move.x += 1;
    
    if(move.lengthSquared() === 0){
      player.velocity = new Vec2(0, 0);
      return 
    }
    const direction = move.normalized(); // normalize movement direction so diagonal movement is not faster
    let speed = player.speed;
    player.direction = direction;
    if(input.isKeyDown("lshift") && player.nitro > 0){
      player.nitroActive = true; 
      speed *= 2;
      player.nitro = Math.max(0, player.nitro - 35 * dt);
    }
    player.velocity = direction.scale(speed);
    player.position = player.position.add(player.velocity.scale(dt));
  }

  /**
   * Continuously decreases the players's fuel level over time. 
   * The game ends when the fuel reaches zero. 
   * @param {number} dt 
   */
  updateFuel(dt){
    const player = this.state.player;
    player.fuel -= 5 * dt; 
    player.fuel = Math.max(0, player.fuel); // clamp fuel to zero to avoid negative values.

    if(player.fuel <= 0){
      this.state.gameOver = true;
      this.state.paused = true; 
      this.state.audio.stopMusic();
    }
  }

  /**
   * Creates a player bullet from the ship nose in the current ship direction.
   */
  shootBullet(dir){
    const player = this.state.player; 
    const bulletRadius = 4;

    const noseOffset = (player.height || player.radius * 2) / 2 + bulletRadius;
    const bulletStart = player.position.add(dir.scale(noseOffset));

    // create a new bullet starting at the tip of the player's ship
    this.state.playerBullets.push({
      position: bulletStart,
      velocity: dir.scale(300),
      radius: bulletRadius,
      life: 2,
    });
    if(this.state.debug.enableSound){
      this.state.audio.playSound("shoot", {volume: 0.6, pitchVariation: 0.2});
    } 
  }

  /**
   * Updates player bullets movement and removes expired bullets
   * @param {number} dt 
   */
  updateBullets(dt){
    for(const bullet of this.state.playerBullets){
      bullet.position = bullet.position.add(bullet.velocity.scale(dt));
      bullet.life -= dt; 
    }
    this.state.playerBullets = this.state.playerBullets.filter(b => b.life > 0);
  }

  /**
   * Checks collisions using either a simple bounding circle, or a
   * complex array of perfectly contoured, rotating rectangles 
   */
  checkAsteroidCollision(){
    const player = this.state.player;
    if(player.hitCooldown > 0) return; 
    // match the physics angle to the visual sprite angle
    player.angle = player.direction.angle() + Math.PI / 2;
    for(const asteroid of this.state.asteroids){
      let isHit = false; 
      let impactPoint = null; 
      let impactNormal = null;
      // --- MODE 1: ARCADE CIRCLES ---
      if(this.state.debug.useCircleColliders){
        const collisionData = getCircleCollision(player, asteroid);
        if(collisionData !== null){
          isHit = true; 
          impactNormal = collisionData.normal; 
          impactPoint = player.position.add(impactNormal.scale(player.radius));
        }
      }  
      // --- MODE 2: COMPOSITE OBB (Oriented Bounding Boxes) ---
      else{
        // pre-calculate trigonometry for the 2D rotation matrix
        const cos = Math.cos(player.angle);
        const sin = Math.sin(player.angle);
        // loop through every rectangular box that makes up the ships wings and body.
        for(const hb of player.hitboxes){
          // 2D rotation matrix: spins the local offset coordinates around the center of the ship
          // so the hitboxes perfectly track the visual sprite when the ship turns
          const rotatedOffsetX = hb.offset.x * cos - hb.offset.y * sin;
          const rotatedOffsetY = hb.offset.x * sin + hb.offset.y * cos;

          // trick the physics engine by creating a dummy object that contains all the players 
          // core stats, but replaces the position/size wiht just this specific wing/body box.
          const dummyHitbox = {
            ...player,
            position: new Vec2(player.position.x + rotatedOffsetX, player.position.y + rotatedOffsetY),
            angle: player.angle,
            width: hb.width,
            height: hb.height
          };

          // check just this specific part against the asteroid
          const collisionData = getOBBCollision(dummyHitbox, asteroid);
          if(collisionData !== null){
            isHit = true; 
            impactNormal = collisionData.normal; 
            impactPoint = getContactPoint(dummyHitbox, asteroid, impactNormal);
            break; // stop checking other boxes, we already crashed
          } 
        }
      }
    
      if(!isHit) continue;
      // PHYSICS RESPONSE 
      if(this.state.debug.rigidBodiesEnabled && asteroid.applyForceAtPoint){
        const speed = player.velocity.length();
        const forceMagnitude = Math.max(speed * 100, 200000);
        const forceVector = impactNormal.scale(-forceMagnitude);
        asteroid.applyForceAtPoint(forceVector, impactPoint);
      }
      // DAMAGE HANDLING
      player.health -= 1; 
      player.hitCooldown = 2; 
      player.healthFlashTime = 0.6;
      if(this.state.debug.enableSound){
        this.state.audio.playSound("asteroid_hit", {volume: 0.7, pitchVariation: 0.4});
        this.state.audio.playSound("explosion");
      }

      if(player.health <= 0){
        this.state.gameOver = true;  
        this.state.paused = true;
        this.state.audio.stopMusic();
      }
      break;
    }
  }

  /**
   * Restricts the player movement to the playable screen area. 
   * The HUD regions are excluded from the valid movement range. 
   */
  keepInsideBounds(){
    const p = this.state.player.position;
    const r = this.state.player.radius; 
    const bounds = this.state.getPlayableBounds(r);

    p.x = Math.max(r, Math.min(this.state.width - r, p.x));
    p.y = Math.max(bounds.top, Math.min(bounds.bottom, p.y));
  }

  /**
   * Handles shooting input 
   * Shooting is disabled while spline control points are edited
   * to avoid interaction conflicts between gameplay and debugging. 
   * @param {number} dt 
   * @param {Input} input 
   * @returns 
   */
  updateShooting(dt, input){
    if(this.state.debug.editingSpline) return;
    const player = this.state.player; 
    if(player.shootCooldown > 0) return; 
    if(input.mouse.leftDown){
      const dir = input.mouse.screen.sub(player.position).normalized();
      this.shootBullet(dir);
      player.shootCooldown = player.shootInterval;
    }
    else if(input.isKeyDown("space")){
      const dir = player.direction.normalized();
      this.shootBullet(dir);
      player.shootCooldown = player.shootInterval;
    }
  }

  /**
   * Checks if the player bullet collides with an asteroid.
   * Reuses the reverse-loop array pattern to safely delete items mid-loop.
   */
  checkPlayerBulletAsteroidCollision(){
    const bullets = this.state.playerBullets; 
    const asteroids = this.state.asteroids; 
    for(let i = bullets.length - 1; i >= 0; i--){
      const bullet = bullets[i];
      for(const asteroid of asteroids){
        if(!isColliding(bullet, asteroid)) continue; 
        bullets.splice(i, 1);
        if(this.state.debug.rigidBodiesEnabled && asteroid.applyForceAtPoint){
          const force = bullet.velocity.normalized().scale(10000);
          asteroid.applyForceAtPoint(force, bullet.position);
        }
        break;
      }
    }
  }
}
