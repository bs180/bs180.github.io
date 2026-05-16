import { Vec2 } from "../math/Vec2.js";
import { isColliding } from "./CollisionSystem.js";
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
   *
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
    if(input.isKeyDown("space") && player.nitro > 0){
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
    }
  }

  /**
   * Creates a player bullet moving in the current mouse direction 
   * Bullets inherit their direction from the normalized player direction vector.
   */
  shootBullet(){
    const player = this.state.player; 
    const mouse = this.state.inputInfo.mouseWorld;

    const dir = mouse.sub(player.position).normalized(); 

    // create a new bullet starting at the players current position
    this.state.playerBullets.push({
      position: player.position.clone(),
      velocity: dir.scale(300),
      radius: 4,
      life: 2,
    });
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
   * Checks collisions between player and asteroids 
   * The player loses health when colliding with an asteroid.
   * A temporary hit cooldown prevents repeated damage every frame. 
   */
  checkAsteroidCollision(){
    const player = this.state.player;
    if(player.hitCooldown > 0) return; 
    for(const asteroid of this.state.asteroids){
      if(!isColliding(player, asteroid)) continue; 
      player.health -= 1; 
      player.hitCooldown = 2; 
      player.healthFlashTime = 0.6;
      if(player.health <= 0){
        this.state.gameOver = true; 
        this.state.paused = true; 
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
   * Handles mouse-based shooting 
   * Shooting is disabled while spline control points are edited
   * to avoid interaction conflicts between gameplay and debugging. 
   * @param {number} dt 
   * @param {Input} input 
   * @returns 
   */
  updateShooting(dt, input){
    if(this.state.debug.editingSpline) return;
    const player = this.state.player; 
    if(input.mouse.leftDown && player.shootCooldown <= 0){
      this.shootBullet();
      player.shootCooldown = player.shootInterval;
    }
  }

  /**
   * Checks if the player bullet collides with an asteroid.
   * If so, the bullet gets deleted and when rigid bodies 
   * are activated, the asteroid gets moved a bit. 
   */
  checkPlayerBulletAsteroidCollision(){
    const bullets = this.state.playerBullets; 
    const asteroids = this.state.asteroids; 
    for(let i = bullets.length - 1; i >= 0; i--){
      const bullet = bullets[i];
      for(const asteroid of asteroids){
        if(!isColliding(bullet, asteroid)) continue; 
        bullets.splice(i, 1);
        if(this.state.debug.rigidBodiesEnabled && asteroid.velocity){
          const impulseDirection = bullet.velocity.normalized();
          asteroid.velocity = asteroid.velocity.add(impulseDirection.scale(50));
        }
        break;
      }
    }
  }
}