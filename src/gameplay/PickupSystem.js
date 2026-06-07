import { isColliding } from "./CollisionSystem.js";

/**
 * Manages the logic, movement and collection of power-ups. 
 * Handles both statically placed items (fuel) and dynamically moving items (nitro).
 */
export class PickupSystem{
  constructor(state){
    this.state = state;
  }

  /**
   * Main update loop for pickups. 
   * Runs sequentially: move dynamic pickups -> update cooldowns -> check for collisions
   */
  update(dt){
    const player = this.state.player; 
    // move the nitro pickup along its curved path
    this.updatePickupOnSpline(this.state.nitroPickup, this.state.nitroSpline, dt);

    // Decrement the pickup cooldown. This prevents a bug where the player overlaps 
    // a pickup for two consecutive frames and accidentally triggers the collection logic twice
    player.pickupCooldown = Math.max(0, this.state.player.pickupCooldown - dt);
  
    if(player.pickupCooldown <= 0){
      // fuel collection
      if(isColliding(player, this.state.fuelPickup)){
        this.collectFuelPickup();
        if(this.state.debug.enableSound){
          this.state.audio.playSound("pickup");
        }
        player.pickupCooldown = 0.3;
      }
      // nitro collection
      if(isColliding(player, this.state.nitroPickup)){
        this.collectNitroPickup();
        if(this.state.debug.enableSound){
          this.state.audio.playSound("pickup");
        }
        player.pickupCooldown = 0.3;
      } 
    }
  }

  /**
   * applies the fuel power-up effects to the player and triggers a respawn
   */
  collectFuelPickup(){
    const player = this.state.player; 

    player.fuel = player.maxFuel;
    player.pickupShipColor = "green";
    player.pickupVisualTime = player.pickupVisualDuration; 

    this.resetFuelPickup();
  }

  /**
   * Moves the fuel pickup to a new random location. 
   * Uses boundaries to ensure it never spawns underneath the UI bars.
   */
  resetFuelPickup(){
    const margin = 80; 

    const radius = this.state.fuelPickup.radius || 0;
    const bounds = this.state.getPlayableBounds(radius);
    const minY = Math.max(margin, bounds.top);
    const maxY = Math.min(this.state.height - margin, bounds.bottom);
    const y = minY <= maxY ? this.randomRange(minY, maxY) : (bounds.top + bounds.bottom) / 2; 
    
    this.state.fuelPickup.position.set(this.randomRange(margin, this.state.width - margin), y);
  }

  /**
   * moves a pickup along a spline 
   */
  updatePickupOnSpline(pickup, spline, dt){
    if(!pickup || !spline) return;

    // acts as global multiplier for how fast time moves on the spline
    const traversalSpeed = this.state.pathInterpolation.traversalSpeed;
    // progrss is normalized value between 0.0 (start) and 1.0 (end)
    pickup.progress += pickup.direction * pickup.speed * traversalSpeed * dt;
    // if it hits the end of the line, reverse direction
    if(pickup.progress >= 1){
      pickup.progress = 1;
      pickup.direction = -1;
    }
    // if it hits the start of the line, go forward again
    else if(pickup.progress <= 0){
      pickup.progress = 0;
      pickup.direction = 1;
    }
    // instead of moving at a rigid speed, we apply an ease function. 
    // this makes the pickup smoothly decelerate as it approaches the ends of the spline
    // and accelerate as it moves through the middle. 
    const easedProgress = spline.ease(pickup.progress, 0.25, 0.75);
    pickup.position.copy(spline.getPoint(easedProgress));
  }

  /**
   * Applies the nitro power-up effects to the player and regenerates the spline path.
   */
  collectNitroPickup(){
    const player = this.state.player; 
    const nitro = this.state.nitroPickup;
    player.nitro = player.maxNitro; 
    player.pickupShipColor = "blue";
    player.pickupVisualTime = player.pickupVisualDuration;

    this.state.nitroSpline.generateRandomControlPoints(this.state.width, this.state.height, 5, 80);
    nitro.progress = 0; 
    nitro.direction = 1; 
    nitro.position.copy(this.state.nitroSpline.getPoint(0));
  }

  randomRange(min, max){
    return Math.random() * (max - min) + min; 
  }
}
