import { Vec2 } from "../math/Vec2.js";
import { isColliding } from "./CollisionSystem.js";


export class EnemySystem{
  constructor(state){
    this.state = state;
    this.maxDrones = 2;
  }
  /**
   * Updates all enemy-related logic. 
   * This includes drone movement, enemy bullets, bullet player collisions, 
   * player-bullet hits and respawning drones. 
   */
  update(dt){
    this.updateDrones(dt);
    this.updateEnemyBullets(dt);
    this.checkEnemyBulletAsteroidCollision();
    this.checkEnemyBulletCollision();
    this.checkPlayerBulletHits();
    this.checkPlayerDroneCollision();
    this.checkAsteroidDroneCollision();
    this.ensureDroneCount();
  }

  /**
   * Udpates drone movement and shooting behavior. 
   * Each frone follwos the player using a simple seek behavior. 
   * A separation vector is added so that drones do not overlap each other. 
   */
  updateDrones(dt){
    const player = this.state.player;

    for(const drone of this.state.drones){
      const toPlayer = player.position.sub(drone.position); // Direction vector pointing from the drone toward the player
      const distanceToPlayer = toPlayer.length();

      drone.angle = toPlayer.angle() + Math.PI / 2; // rotate the drone sprite so it visually faces the player

      let moveDir = new Vec2(0, 0);

      const followDistance = 140; // minimum distance drones try to maintain from the player

      // only move toward the player if the drone is outside the follow distance 
      if(distanceToPlayer > followDistance){
        moveDir = moveDir.add(toPlayer.normalized());
      }

      // separation steering force prevents drones from overlapping each other
      let separation = new Vec2(0, 0);
      for(const other of this.state.drones){
        if(other === drone) continue;
        const awayFromOther = drone.position.sub(other.position);
        const distanceToOther = awayFromOther.length();

        const minDistance = drone.radius + other.radius + 20;
        if(distanceToOther < minDistance && distanceToOther > 0){
          separation = separation.add(awayFromOther.normalized().scale(1 / distanceToOther));
        }
      }
      moveDir = moveDir.add(separation.scale(3)); // combine seek behavior and separation behavior into a single movement direction
      if(moveDir.lengthSquared() > 0){
        moveDir = moveDir.normalized(); // normalize the final direction so movement speed remains constant
        drone.position = drone.position.add(moveDir.scale(drone.speed * dt)); // frame-rate independent movement integration
      }

      drone.shootCooldown -= dt; 
      if(drone.shootCooldown <= 0){
        this.createEnemyBullet(drone);
        drone.shootCooldown = drone.shootInterval;
      }
    }
  }

  /**
   * Creates an enemy bullet travelling toward the player 
   * @param {Object} drone 
   */
  createEnemyBullet(drone){
    const player = this.state.player; 
    const dir = player.position.sub(drone.position).normalized();

    this.state.enemyBullets.push({
      position: drone.position.clone(),
      velocity: dir.scale(200),
      radius: 5,
      life: 3,
    });
  }

  /**
   * Updates enemy bullet positions and removes bullets that are expired or 
   * outside the visible game area. 
   * Bullet movement is updated using frame-rate independent integration. 
   * @param {number} dt 
   */
  updateEnemyBullets(dt){
    for(const bullet of this.state.enemyBullets){
      bullet.position = bullet.position.add(bullet.velocity.scale(dt));
      bullet.life -= dt; // decrease remaining bullet lifetime
    }

    this.state.enemyBullets = this.state.enemyBullets.filter(
      bullet => 
        bullet.life > 0 && 
        bullet.position.x > -50 && 
        bullet.position.x < this.state.width + 50 && 
        bullet.position.y > -50 && 
        bullet.position.y < this.state.height + 50
    );
  }

  /**
   * Checks collisions between enemy bullets and the player. 
   * When a collision occurs, the player loses health and the 
   * colliding bullet is removed. A temporary hit cooldown prevents 
   * the player form receiving damage every frame.
   */
  checkEnemyBulletCollision(){
    const player = this.state.player; 

    if(player.hitCooldown > 0) return; 

    for(let i = this.state.enemyBullets.length - 1; i >= 0; i--){
      const bullet = this.state.enemyBullets[i];
      if(isColliding(player, bullet)){
        player.health -= 1; 
        player.hitCooldown = 1.2;

        this.state.enemyBullets.splice(i, 1); // remove the bullet after the collision
        if(player.health <= 0){
          this.state.gameOver = true; 
          this.state.paused = true;
        }
        return; 
      }
    }
  }

  /**
   * Checks collisions between player bullets and enemy drones. 
   * Destroyed drones are removed and immediately replaced to keep 
   * the gameplay pressure constant. 
   */
  checkPlayerBulletHits(){
    const bullets = this.state.playerBullets;
    const drones = this.state.drones; 

    for(let i = bullets.length - 1; i >= 0; i--){
      const bullet = bullets[i];
      for(let j = drones.length - 1; j >= 0; j--){
        const drone = drones[j];
        if(isColliding(bullet, drone)){
          bullets.splice(i, 1);
          drones.splice(j, 1);
          this.spawnDrone();
          break;
        }
      }
    }
  }

  /**
   * Spawns a new enemy drone at a random position inside the playable region. 
   * A margin is used to avoid spawning directly at the screen borders. 
   */
  spawnDrone(){
    const margin = 60; 
    const x = Math.random() * (this.state.width - 2 * margin) + margin; 
    const y = Math.random() * (this.state.height - 2 * margin) + margin; 

    this.state.drones.push({
      position: new Vec2(x, y),
      radius: 16, 
      speed: 80, 
      angle: 0, 
      shootCooldown: 0, 
      shootInterval: 1.5,
    });
  }

  /**
   * Ensures that the game always contains the configured number of drones. 
   * Missing drones are automatically respawned. 
   */
  ensureDroneCount(){
    while(this.state.drones.length < this.maxDrones){
      this.spawnDrone();
    }
  }

  /**
   * Checks if the player collides with an enemy drone. 
   * On impact, health is reduced by one.
   */
  checkPlayerDroneCollision(){
    const player = this.state.player;
    if(player.hitCooldown > 0) return; 
    for(const drone of this.state.drones){
      if(!isColliding(player, drone)) continue;
      player.health -= 1; 
      player.hitCooldown = 1.2; 
      player.healthFlashTime = 0.6; 
      if(player.health <= 0){
        this.state.gameOver = true; 
        this.state.paused = true; 
      }
      break;
    }
  }

  /**
   * Checks if a drone collides with an asteroid. 
   * If they collide, the drone gets deleted and a 
   * new drone spawns. 
   */
  checkAsteroidDroneCollision(){
    const drones = this.state.drones; 
    const asteroids = this.state.asteroids; 
    for(let i = drones.length - 1; i >= 0; i--){
      const drone = drones[i];
      for(const asteroid of asteroids){
        if(!isColliding(drone, asteroid)) continue; 
        drones.splice(i, 1);
        this.spawnDrone();
        break;
      }
    }
  }

  /**
   * Checks collision between enemy bullet and 
   * asteroid. On impact and when rigid body 
   * dynamics are activated, a certain force 
   * is applied to the asteroid. 
   */
  checkEnemyBulletAsteroidCollision(){
    const bullets = this.state.enemyBullets; 
    const asteroids = this.state.asteroids; 
    for(let i = bullets.length - 1; i >= 0; i--){
      const bullet = bullets[i];
      for(const asteroid of asteroids){
        if(!isColliding(bullet, asteroid)) continue; 
        bullets.splice(i, 1);
        if(this.state.debug.rigidBodiesEnabled && asteroid.velocity){
          const impulseDirection = bullet.velocity.normalized();
          asteroid.velocity = asteroid.velocity.add(impulseDirection.scale(10));
        }
        break;
      }
    }
  }
}