import { MotionBlur } from "./MotionBlur.js";

export class Renderer{
  constructor(ctx, assets){
    this.ctx = ctx; // ctx is the canvas context
    this.assets = assets; 
    this.motionBlur = new MotionBlur();
  }

  /**
   * Renders a single frame of the game 
   * 
   * This function is called once per animation frame by the game loop. 
   * It is responsible for drawing the complete visual stateof the game onto the HTML5 Canvas. 
   * 
   * The rendering follows a back-to-front order to ensure correct layering: 
   * background -> orbit guides -> celestial objects -> player -> UI 
   * 
   * The canvas is cleared at the beginning of each frame to remove artifacts from the previous frame.
   * 
   * @param {GameState} state - contains all current game data (positions, UI, etc.) 
   * @param {number} interpolationAlpha - Interpolation factor used for smooth rendering between fixed simulation updates.
   */
  render(state, interpolationAlpha = 0){
    const ctx = this.ctx; 

    ctx.clearRect(0, 0, state.width, state.height);
    this.drawBackground(state);
    this.drawOrbitGuides(state);
    this.drawStar(state);
    this.drawPlanets(state);
    this.drawMoons(state);
    this.drawSatellites(state);
    this.drawSplinePath(state, state.nitroSpline, "#00eaff");
    this.drawPickup(state, state.fuelPickup);
    this.drawPickup(state, state.nitroPickup);
    this.drawAsteroids(state);
    this.drawDrones(state);
    this.drawRigidBodyDebug(state);
    this.drawEnemyBullets(state);
    this.drawPlayerBullets(state);
    this.drawNitroTrail(state);
    this.drawPlayer(state);
    this.drawHudBars(state);

    if(state.gameOver){
      this.drawGameOverOverlay(state);
    }
  }

  /**
   * Draws a simple starfield background
   * @param {GameState} state 
   */
  drawBackground(state){
    const ctx = this.ctx;
    ctx.save();

    for(let i = 0; i < 120; i++){
      const x = (i * 127) % state.width; 
      const y = (i *  83) % state.height; 
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.restore();
  }

  /**
   * Draws circular orbit guides for planets and moons.
   * 
   * These visual aids help illustrate the hierarchical motion 
   * of celestrial objects around their parent objects. 
   * @param {GameState} state 
   */
  drawOrbitGuides(state){
    if(!state.debug.showOrbitGuides) return; 
    const ctx = this.ctx; 

    ctx.save(); 
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;

    for(let i = 0; i < state.planetNodes.length; i++){
      const node = state.planetNodes[i];
      const parent = node.parent; 

      ctx.beginPath();
      ctx.arc(parent.worldPosition.x, parent.worldPosition.y, state.planets[i].orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(120,180,255,0.18)";
    for(let i = 0; i < state.moonNodes.length; i++){
      const node = state.moonNodes[i];
      const parent = node.parent; 

      ctx.beginPath();
      ctx.arc(parent.worldPosition.x, parent.worldPosition.y, state.moons[i].orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    for(let i = 0; i < state.satelliteNodes.length; i++){
      const node = state.satelliteNodes[i];
      const parent = node.parent; 

      ctx.beginPath();
      ctx.arc(parent.worldPosition.x, parent.worldPosition.y, state.satellites[i].orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

/**
 * 
 * @param {*} state 
 */
  drawStar(state){
    const ctx = this.ctx; 
    const star = state.star; 

    ctx.save(); 
    ctx.beginPath();
    ctx.arc(star.position.x, star.position.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = star.color; 
    ctx.fill(); 
    ctx.restore(); 
  }

  /**
   * Draws central star
   * @param {GameState} state 
   */
  drawPlanets(state){
    const ctx = this.ctx;

    for(const planet of state.planets){
      ctx.save();
      ctx.beginPath();
      ctx.arc(planet.position.x, planet.position.y, planet.radius, 0, Math.PI * 2);
      ctx.fillStyle = planet.color; 
      ctx.fill(); 
      ctx.restore(); 
    }
  }

  drawMoons(state){
    const ctx = this.ctx; 

    for(const moon of state.moons){
      ctx.save();
      ctx.beginPath();
      ctx.arc(moon.position.x, moon.position.y, moon.radius, 0, Math.PI * 2);
      ctx.fillStyle = moon.color; 
      ctx.fill(); 
      ctx.restore(); 
    }
  }

  // /**
  //  * Draws the player spaceship 
  //  * 
  //  * The player is rendered using a local coordinate system. 
  //  * The cnavas is translated to the player's position and rotated according to the movement 
  //  * direction. This allows the ship to always face its current velocity direction. 
  //  * @param {GameState} state 
  //  */
  drawPlayer(state){
    const ctx = this.ctx; 
    const player = state.player; 
    const shipImage = this.getPlayerShipImage(player);

    if(!shipImage.complete){
      return;
    }

    const shipScale = this.getPlayerShipScale(player);
    const shipWidth = 48 * shipScale;
    const shipHeight = 48 * shipScale;
    const shipAlpha = this.getPlayerShipAlpha(player);

    

    ctx.save();
    if(player.hitCooldown > 0) ctx.globalAlpha = 0.45;

    ctx.translate(player.position.x, player.position.y);
    ctx.rotate(player.direction.angle() + Math.PI / 2);
    ctx.globalAlpha = shipAlpha;
    ctx.drawImage(shipImage, -shipWidth/2, -shipHeight/2, shipWidth, shipHeight); 
    ctx.restore();
    
    // Draw motion blur if nitro is active
    if(player.nitroActive){
      this.motionBlur.drawPlayer(ctx, player, shipImage, shipWidth, shipHeight, shipAlpha);
    }
  }

  drawNitroTrail(state){
    const ctx = this.ctx;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for(const particle of state.nitroTrail){
      const ratio = Math.max(0, particle.life / particle.maxLife);
      const radius = particle.radius * ratio;
      const gradient = ctx.createRadialGradient(
        particle.position.x,
        particle.position.y,
        0,
        particle.position.x,
        particle.position.y,
        radius
      );

      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.85 * ratio})`);
      gradient.addColorStop(0.35, `rgba(80, 220, 255, ${0.7 * ratio})`);
      gradient.addColorStop(1, "rgba(30, 120, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getPlayerShipImage(player){
    if(player.pickupVisualTime > 0){
      if(player.pickupShipColor === "blue" && this.assets.shipBlue.complete){
        return this.assets.shipBlue;
      }
      if(player.pickupShipColor === "green" && this.assets.shipGreen.complete){
        return this.assets.shipGreen;
      }
    }

    return this.assets.ship;
  }

  getPlayerShipScale(player){
    if(player.pickupVisualTime <= 0){
      return 1;
    }

    const duration = player.pickupVisualDuration || 0.5;
    const progress = Math.max(0, Math.min(1, player.pickupVisualTime / duration));
    return 1 + 0.35 * progress;
  }

  getPlayerShipAlpha(player){
    if(player.hitCooldown <= 0){
      return 1;
    }

    return Math.floor(player.hitCooldown * 16) % 2 === 0 ? 0.35 : 1;
  }

  drawHudBars(state){
    const ctx = this.ctx;

    ctx.save();
    this.drawTopInfoBar(state);
    this.drawBottomInfoBar(state);
    ctx.restore();
  }

  drawTopInfoBar(state){
    const ctx = this.ctx;
    const barHeight = state.hud.topBarHeight;
    const sectionCount = 5;
    const sectionWidth = state.width / sectionCount;
    const motionBlurName = this.getMotionBlurName();
    const motionBlurSamples = this.motionBlur.blurSamples;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.fillRect(0, 0, state.width, barHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barHeight);
    ctx.lineTo(state.width, barHeight);
    ctx.stroke();

    for(let i = 1; i < sectionCount; i++){
      const x = sectionWidth * i;
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, barHeight - 10);
      ctx.stroke();
    }

    this.drawInfoSection(sectionWidth * 0, 0, sectionWidth, barHeight, `PATH INTERPOLATION: ${state.pathInterpolation.traversalSpeed.toFixed(2)} / ${state.pathInterpolation.updateRate}`, [
      `Traversal Speed:      I / K`,
      `Update Rate:          J / L`,
    ]);
    this.drawInfoSection(sectionWidth * 1, 0, sectionWidth, barHeight, `RIGID BODY: ${state.debug.rigidBodiesEnabled ? "ON" : "OFF"} [R]`, [`Colliders: ${state.debug.showColliders ? "ON" : "OFF"} [C]`, `Momentum: ${state.debug.showMomentumVectors ? "ON" : "OFF"} [V]`,]);
    this.drawInfoSection(sectionWidth * 2, 0, sectionWidth, barHeight, `MOTION BLUR: ${motionBlurName} [${motionBlurSamples}]`, [
      "Switch Mode:        B",
      "Change Samples: N",
    ]);
    this.drawInfoSection(sectionWidth * 3, 0, sectionWidth, barHeight, " HIERARCHICAL TRANSFORMATIONS", [
      "Trajectories: T",
    ]);
    this.drawInfoSection(sectionWidth * 4, 0, sectionWidth, barHeight, `FPS: ${state.runtime.simulationHz.toFixed(0)}`, [
      "Change FPS: F",
      "Pause Game: P",
    ]);

    if(state.paused){
      ctx.fillStyle = "#ffcc44";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("GAME PAUSED", state.width / 2, barHeight + 12);
    }

    ctx.restore();
  }

  drawBottomInfoBar(state){
    const ctx = this.ctx;
    const player = state.player;
    const barHeight = state.hud.bottomBarHeight;
    const y = state.height - barHeight;
    const sectionWidth = state.width / 4;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
    ctx.fillRect(0, y, state.width, barHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();

    for(let i = 1; i < 4; i++){
      const x = sectionWidth * i;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x, y + barHeight - 8);
      ctx.stroke();
    }

    this.drawHealthLabel(sectionWidth * 0, y, sectionWidth, barHeight, player);

    const fuelRatio = player.fuel / player.maxFuel;
    const fuelCritical = fuelRatio < 0.2;
    const fuelFlashOn = fuelCritical && Math.floor(state.time * 14) % 2 === 0;

    if(fuelFlashOn){
      ctx.fillStyle = "rgba(255, 77, 109, 0.18)";
      ctx.fillRect(sectionWidth * 1, y, sectionWidth, barHeight);
    }

    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fuelFlashOn ? "#ffcc44" : "#ffffff";
    ctx.fillText("FUEL", sectionWidth * 1 + 18, y + 20);
    this.drawBar(sectionWidth * 1 + 18, y + 34, sectionWidth - 36, 16, player.fuel, player.maxFuel, this.getFuelBarColor(player));

    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("NITRO: Press \"Space bar\" to activate", sectionWidth * 2 + 18, y + 20);
    this.drawBar(sectionWidth * 2 + 18, y + 34, sectionWidth - 36, 16, player.nitro, player.maxNitro, "#3da9fc");

    this.drawBottomLabel(
      sectionWidth * 3,
      y,
      sectionWidth,
      barHeight,
      "TIME",
      this.formatTime(state.time)
    );

    ctx.fillStyle = "rgba(18, 223, 18, 0.45)";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";

    ctx.fillText("ASTRO DRIFT", state.width - 14, state.height - 8);

    ctx.restore();
  }

  drawInfoSection(x, y, width, height, title, lines){
    const ctx = this.ctx;
    const centerX = x + width / 2;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffcc44";
    ctx.font = "bold 16px Arial";
    ctx.fillText(title, centerX, y + 14);

    for(let i = 0; i < lines.length; i++){
      if(lines[i].includes("PAUSED")){
        ctx.fillStyle = "#ffcc44";
        ctx.font = "bold 16px Arial";
      }
      else{
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px Arial";
      }
      ctx.fillText(lines[i], centerX, y + 40 + i * 20);
    }
  }

  drawHealthLabel(x, y, width, height, player){
    const ctx = this.ctx;
    const centerX = x + width / 2;
    let hearts = "";

    for(let i = 0; i < player.maxHealth; i++){
      hearts += i < player.health ? "♥ " : "♡ ";
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.fillText("HEALTH", centerX, y + 22);

    const flashActive = player.healthFlashTime > 0;
    const flashOn = flashActive && Math.floor(player.healthFlashTime * 14) % 2 === 0;
    ctx.fillStyle = flashOn ? "#ffcc44" : "#ff4d6d";
    ctx.font = "24px Arial";
    ctx.fillText(hearts.trim(), centerX, y + 44);
  }

  drawBottomLabel(x, y, width, height, title, value){
    const ctx = this.ctx;
    const centerX = x + width / 2;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.fillText(title, centerX, y + 22);

    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial";
    ctx.fillText(value, centerX, y + 44);
  }

  formatTime(seconds){
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  getMotionBlurName()
  {
    return this.motionBlur.blurName || "None";
  }


  drawBar(x, y, width, height, value, maxValue, fillColor){
    const ctx = this.ctx; 
    const ratio = Math.max(0, Math.min(1, value / maxValue));

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = fillColor; 
    ctx.fillRect(x, y, width * ratio, height); 

    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1; 
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(ratio * 100)}%`, x + width / 2, y + height / 2);
  }

  getFuelBarColor(player){
    const ratio = player.fuel / player.maxFuel;

    if(ratio < 0.2){
      return "#ff4d6d";
    }

    if(ratio < 0.5){
      return "#ffcc44";
    }

    return "#3ddc84";
  }

  drawSplinePath(state, spline, color){
    if(!state.debug.showSplinePath) return; 
    if(!spline) return;

    const ctx = this.ctx; 
    const sampleCount = state.pathInterpolation ? state.pathInterpolation.updateRate : 100;
    const points = spline.sample(sampleCount);

    if(points.length < 2) return; 

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3; 
    ctx.beginPath(); 
    ctx.moveTo(points[0].x, points[0].y);

    for(let i = 1; i < points.length; i++){
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
    ctx.fillStyle = "#ffffff";

    const controlPoints = spline.getControlPoints();

    for(let i = 0; i < controlPoints.length; i++){
      const p = controlPoints[i];
      ctx.beginPath(); 
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill(); 
    }
    ctx.restore();

    const arcLengthTable = spline.getArcLengthTable();
    ctx.fillStyle = "#ffcc44";
    for(let i = 0; i < arcLengthTable.length; i+=10){
      const p = arcLengthTable[i].point; 
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPickup(state, pickup){
    const ctx = this.ctx;
    const image = pickup === state.fuelPickup ? this.assets.fuel : this.assets.nitro;

    if(!image.complete) return; 

    const size = 36; 

    ctx.save(); 
    ctx.translate(pickup.position.x, pickup.position.y); 
    ctx.drawImage(image, -size/2, -size/2, size, size);
    ctx.restore();
  }

  drawSatellites(state){
    const ctx = this.ctx; 

    for(const satellite of state.satellites){
      ctx.save();
      ctx.beginPath();
      ctx.arc(satellite.position.x, satellite.position.y, satellite.radius, 0, Math.PI * 2);
      ctx.fillStyle = satellite.color; 
      ctx.fill(); 
      ctx.restore(); 
    }
  }

  drawAsteroids(state){
    const ctx = this.ctx; 
    const image = this.assets.asteroid;

    if(!image.complete) return; 

    for(const asteroid of state.asteroids){
      const size = asteroid.radius * 2.4;

      ctx.save();
      ctx.translate(asteroid.position.x, asteroid.position.y);
      ctx.rotate(asteroid.angle);
      ctx.drawImage(image, -size/2, -size/2, size, size);
      ctx.restore();
    }
  }

  drawDrones(state){
    const ctx = this.ctx; 
    const image = this.assets.drones; 

    if(!image.complete) return; 

    for(const drone of state.drones){
      const size = drone.radius * 3;
      ctx.save(); 
      ctx.translate(drone.position.x, drone.position.y);
      ctx.rotate(drone.angle);
      ctx.drawImage(image, -size/2, -size/2, size, size);
      ctx.restore();
    }
  }

  drawEnemyBullets(state){
    const ctx = this.ctx; 
    ctx.save(); 

    for(const bullet of state.enemyBullets){
      ctx.fillStyle = "#ff3355";
      ctx.beginPath();
      ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlayerBullets(state){
    const ctx = this.ctx; 

    ctx.save();
    ctx.fillStyle = "#66d9ff";
    for(const bullet of state.playerBullets){
      ctx.beginPath();
      ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawRigidBodyDebug(state){
    const bodies = [...state.asteroids, ...state.drones];
    if(state.debug.showColliders){
      this.drawColliders(bodies);
    }
    if(state.debug.showMomentumVectors){
      this.drawMomentumVectors(bodies);
    }
  }

  drawColliders(bodies){
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2; 
    for(const body of bodies){
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, body.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMomentumVectors(bodies){
    const ctx = this.ctx; 
    ctx.save();
    ctx.strokeStyle = "#ffcc44";
    ctx.fillStyle = "#ffcc44";
    ctx.lineWidth = 3; 

    for(const body of bodies){
      if(!body.velocity) continue; 
      const mass = body.mass || 1;
      const momentum = body.velocity.scale(mass);
      const scale = 0.08;
      const start = body.position;
      const end = body.position.add(momentum.scale(scale));
      this.drawArrow(start.x, start.y, end.x, end.y);
    }
    ctx.restore();
  }

  drawArrow(x1, y1, x2, y2){
    const ctx = this.ctx; 
    const headLength = 10; 
    const angle = Math.atan2(y2-y1, x2-x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(x2, y2);
    ctx.fill();
  }
}
