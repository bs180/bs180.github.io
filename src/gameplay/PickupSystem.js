import { isColliding } from "./CollisionSystem.js";

export class PickupSystem{
  constructor(state){
    this.state = state;
  }

  update(dt){
    const player = this.state.player; 
    this.updatePickupOnSpline(this.state.nitroPickup, this.state.nitroSpline, dt);

    player.pickupCooldown = Math.max(0, this.state.player.pickupCooldown - dt);
  
    if(player.pickupCooldown <= 0){
      if(isColliding(player, this.state.fuelPickup)){
        this.collectFuelPickup();
        player.pickupCooldown = 0.3;
      }
      if(isColliding(player, this.state.nitroPickup)){
        this.collectNitroPickup();
        player.pickupCooldown = 0.3;
      } 
    }
  }

  collectFuelPickup(){
    const player = this.state.player; 

    player.fuel = player.maxFuel;
    player.pickupShipColor = "green";
    player.pickupVisualTime = player.pickupVisualDuration; 

    this.state.score += 100; 
    this.state.timeLeft += 10;

    this.resetFuelPickup();
  }

  resetFuelPickup(){
    const margin = 80; 

    const radius = this.state.fuelPickup.radius || 0;
    const bounds = this.state.getPlayableBounds(radius);
    const minY = Math.max(margin, bounds.top);
    const maxY = Math.min(this.state.height - margin, bounds.bottom);
    const y = minY <= maxY ? this.randomRange(minY, maxY) : (bounds.top + bounds.bottom) / 2; 
    
    this.state.fuelPickup.position.set(this.randomRange(margin, this.state.width - margin), y);
  }

  updatePickupOnSpline(pickup, spline, dt){
    if(!pickup || !spline) return;

    const traversalSpeed = this.state.pathInterpolation.traversalSpeed;
    pickup.progress += pickup.direction * pickup.speed * traversalSpeed * dt;
    if(pickup.progress >= 1){
      pickup.progress = 1;
      pickup.direction = -1;
    }
    else if(pickup.progress <= 0){
      pickup.progress = 0;
      pickup.direction = 1;
    }
    // pickup.position.copy(spline.getPoint(pickup.progress));
    const easedProgress = spline.ease(pickup.progress, 0.25, 0.75);
    pickup.position.copy(spline.getPoint(easedProgress));
  }

  collectNitroPickup(){
    const player = this.state.player; 
    const nitro = this.state.nitroPickup;
    player.nitro = player.maxNitro; 
    player.pickupShipColor = "blue";
    player.pickupVisualTime = player.pickupVisualDuration;

    this.state.score += 200; 
    this.state.nitroSpline.generateRandomControlPoints(this.state.width, this.state.height, 5, 80);
    nitro.progress = 0; 
    nitro.direction = 1; 
    nitro.position.copy(this.state.nitroSpline.getPoint(0));
  }

  randomRange(min, max){
    return Math.random() * (max - min) + min; 
  }
}
