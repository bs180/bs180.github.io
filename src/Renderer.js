import { MotionBlur } from "./MotionBlur.js";
export class Renderer{
  constructor(ctx, assets){
    this.ctx = ctx; // ctx is the canvas context
    this.assets = assets; 
    this.stars = [];
    for(let i = 0; i < 400; i++){
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.8 + 0.2
      });
    }
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
    this.drawEnemyBullets(state);
    this.drawPlayerBullets(state);
    this.drawNitroTrail(state);
    this.drawPlayer(state);
    this.drawRigidBodyDebug(state);

    this.drawHudBars(state);
    this.drawAsteroidWarning(state);

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

    for(const star of this.stars){
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      ctx.fillRect(
        star.x * state.width,
        star.y * state.height,
        star.size, 
        star.size
      );
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
    ctx.lineWidth = 2;

    const bodies = [...state.planets, ...state.moons, ...state.satellites,];
    for(const body of bodies){
      this.drawTrajectory(body);
    }

    ctx.restore();
  }

  drawTrajectory(body){
    const ctx = this.ctx; 
    if(!body.trajectory || body.trajectory.length < 2) return; 

    ctx.save();
    ctx.strokeStyle = body.color || "rgba(255,255,255,0.5)";
    ctx.beginPath();

    const first = body.trajectory[0].position;
    ctx.moveTo(first.x, first.y);

    for(let i = 1; i < body.trajectory.length; i++){
      const p = body.trajectory[i].position;
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

/**
 * 
 * @param {*} state 
 */
  drawStar(state){
    const ctx = this.ctx; 
    const star = state.star; 
    const sunImage = this.assets.sun;

    ctx.save(); 
    if(sunImage && sunImage.complete && sunImage.naturalWidth > 0){
      const size = star.radius * 4;

      ctx.translate(star.position.x, star.position.y);
      ctx.rotate(state.time * 0.2);
      ctx.drawImage(
        sunImage,
        -size / 2,
        -size / 2,
        size,
        size
      );
    }
    else{
      ctx.beginPath();
      ctx.arc(star.position.x, star.position.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = star.color; 
      ctx.fill(); 
    }
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
      const planetImage = planet.texture ? this.assets[planet.texture] : null;

      if(planetImage && planetImage.complete && planetImage.naturalWidth > 0){
        const size = planet.radius * 2.4;
        ctx.save();
        ctx.translate(planet.position.x, planet.position.y);
        ctx.rotate(planet.rotation || 0);
        ctx.drawImage(planetImage, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      else{
        ctx.beginPath();
        ctx.arc(planet.position.x, planet.position.y, planet.radius, 0, Math.PI * 2);
        ctx.fillStyle = planet.color; 
        ctx.fill(); 
      }

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2; 
      ctx.beginPath();
      ctx.moveTo(planet.position.x, planet.position.y);
      ctx.lineTo(
        planet.position.x + Math.cos(planet.rotation || 0) * planet.radius, 
        planet.position.y + Math.sin(planet.rotation || 0) * planet.radius
      );
      ctx.stroke();
      ctx.restore(); 
    }
  }

  drawMoons(state){
    const ctx = this.ctx; 

    for(const moon of state.moons){
      ctx.save();
      const moonImage = moon.texture ? this.assets[moon.texture] : null;

      if(moonImage && moonImage.complete && moonImage.naturalWidth > 0){
        const size = moon.radius * 2.4;
        ctx.save();
        ctx.translate(moon.position.x, moon.position.y);
        ctx.rotate(moon.rotation || 0);
        ctx.drawImage(moonImage, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      else{
        ctx.beginPath();
        ctx.arc(moon.position.x, moon.position.y, moon.radius, 0, Math.PI * 2);
        ctx.fillStyle = moon.color; 
        ctx.fill(); 
      }

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2; 
      ctx.beginPath();
      ctx.moveTo(moon.position.x, moon.position.y);
      ctx.lineTo(
        moon.position.x + Math.cos(moon.rotation || 0) * moon.radius, 
        moon.position.y + Math.sin(moon.rotation || 0) * moon.radius
      );
      ctx.stroke();
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
    const baseWidth = player.width || 48;
    const baseHeight = player.height || 48;
    const shipWidth = baseWidth * shipScale;
    const shipHeight = baseHeight * shipScale;
    const shipAlpha = this.getPlayerShipAlpha(player);

    if(player.nitroActive && this.motionBlur.enabled){
      this.motionBlur.drawPlayer(ctx, player, shipImage, shipWidth, shipHeight);
      return;
    }

    ctx.save();
    if(player.hitCooldown > 0) ctx.globalAlpha = 0.45;

    ctx.translate(player.position.x, player.position.y);
    ctx.rotate(player.direction.angle() + Math.PI / 2);
    ctx.globalAlpha = shipAlpha;
    ctx.drawImage(shipImage, -shipWidth/2, -shipHeight/2, shipWidth, shipHeight); 
    ctx.restore();
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

  drawAsteroidWarning(state){
    if(state.asteroidWarningTime <= 0) return;

    const ctx = this.ctx;
    const pulseOn = Math.floor(state.asteroidWarningTime * 8) % 2 === 0;
    const alpha = pulseOn ? 0.62 : 0.22;
    const edgeWidth = pulseOn ? 10 : 6;
    const textX = state.width - 24;
    const textY = state.hud.topBarHeight + 18;

    ctx.save();

    ctx.strokeStyle = `rgba(255, 77, 109, ${alpha})`;
    ctx.lineWidth = edgeWidth;
    ctx.strokeRect(
      edgeWidth / 2,
      edgeWidth / 2,
      state.width - edgeWidth,
      state.height - edgeWidth
    );

    ctx.fillStyle = pulseOn ? "#ffcc44" : "#ff4d6d";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("Asteroid incoming!", textX, textY);

    ctx.restore();
  }

  drawTopInfoBar(state){
    const ctx = this.ctx;
    const barHeight = state.hud.topBarHeight;
    const columnRatios = [0.075, 0.175, 0.075, 0.175, 0.075, 0.175, 0.075, 0.175];
    const columnWidths = columnRatios.map(ratio => state.width * ratio);
    const columnX = [];
    let currentX = 0;

    for(const width of columnWidths){
      columnX.push(currentX);
      currentX += width;
    }

    const topBarItems = [
      {
        key: "1",
        title: "Path Interpolation",
        enabled: state.debug.showSplinePath,
        detailFontSize: 14,
        detailLineHeight: 16,
        lines: [
          [
            { text: "Change Speed [I/K]: " },
            { text: state.pathInterpolation.traversalSpeed.toFixed(2), bold: true },
          ],
          [
            { text: "Update Rate     [J/L]: " },
            { text: String(state.pathInterpolation.updateRate), bold: true },
          ],
          [
            { text: "Randomize Spline:    " },
            { text: "O", bold: true },
          ],
        ],
      },
      {
        key: "2",
        title: "Rigid Body",
        enabled: state.debug.rigidBodiesEnabled,
        detailFontSize: 14,
        detailLineHeight: 16,
        lines: [
          [
            { text: "Show Colliders     [C]: "},
            { text: state.debug.showColliders ? "ON" : "OFF", bold: state.debug.showColliders },
          ],
          [
            { text: "Show Momentum [V]: " },
            { text: state.debug.showMomentumVectors ? "ON" : "OFF", bold: state.debug.showMomentumVectors },
          ],
          [
            { text: "Change Colliders [B]: " },
            { text: state.debug.useCircleColliders ? "Circle" : "Box", bold: true },
          ],
        ],
      },
      {
        key: "3",
        title: "Motion Blur",
        enabled: this.motionBlur.enabled,
        lines: [
          [
            { text: "Change Mode      [M]: " },
            { text: this.getMotionBlurName(), bold: true },
          ],
          [
            { text: "Change Samples [N]: " },
            { text: String(this.motionBlur.blurSamples), bold: true },
          ],
        ],
      },
      {
        key: "4",
        title: "Transformations",
        enabled: state.debug.showOrbitGuides,
        lines: [
          [
            { text: "Show Trajectories [T]: " },
            { text: state.debug.showOrbitGuides ? "ON" : "OFF", bold: state.debug.showOrbitGuides },
          
          ],
          [
            { text: "Pause Game         [P]: " },
            { text: state.paused ? "ON" : "OFF", bold: state.paused },
          ],
          [
            { text: "Quaternions   [Q]: " },
            { text: state.debug.useQuaternions ? "ON" : "OFF", bold: state.debug.useQuaternions },
          ],
        ],
      },
    ];

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.fillRect(0, 0, state.width, barHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barHeight);
    ctx.lineTo(state.width, barHeight);
    ctx.stroke();

    for(let i = 1; i < columnX.length; i++){
      const x = columnX[i];
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, barHeight - 10);
      ctx.stroke();
    }

    for(let i = 0; i < topBarItems.length; i++){
      const keyColumnIndex = i * 2;
      const featureColumnIndex = keyColumnIndex + 1;
      const item = topBarItems[i];

      this.drawToggleKeyColumn(columnX[keyColumnIndex], 0, columnWidths[keyColumnIndex], barHeight, item.key, item.enabled);
      this.drawFeatureColumn(columnX[featureColumnIndex], 0, columnWidths[featureColumnIndex], barHeight, item);
    }

    if(state.paused){
      ctx.fillStyle = "#ffcc44";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("GAME PAUSED", state.width / 2, barHeight + 12);
    }

    ctx.restore();
  }

  drawToggleKeyColumn(x, y, width, height, key, enabled){
    const ctx = this.ctx;
    const centerX = x + width / 2;
    const color = enabled ? "#ffcc44" : "#777777";

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = color;
    ctx.font = "bold 40px Arial";
    ctx.fillText(key, centerX, y + 12);

    ctx.font = "16px Arial";
    ctx.fillText(enabled ? "Enabled" : "Disabled", centerX, y + 60);
  }

  drawFeatureColumn(x, y, width, height, item){
    const ctx = this.ctx;
    const textX = x + 12;
    const titleColor = item.enabled ? "#ffcc44" : "#777777";
    const detailColor = item.enabled ? "#ffffff" : "#888888";

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = titleColor;
    ctx.font = "bold 20px Arial";
    ctx.fillText(item.title, textX, y + 14);

    ctx.fillStyle = detailColor;
    const detailFontSize = item.detailFontSize || 16;
    const detailLineHeight = item.detailLineHeight || 18;
    for(let i = 0; i < item.lines.length; i++){
      this.drawFeatureLine(item.lines[i], textX, y + 40 + i * detailLineHeight, detailColor, detailFontSize);
    }
  }

  drawFeatureLine(segments, x, y, color, fontSize = 16){
    const ctx = this.ctx;
    let currentX = x;

    ctx.fillStyle = color;
    ctx.textBaseline = "top";

    for(const segment of segments){
      ctx.font = `${segment.bold ? "bold " : ""}${fontSize}px Arial`;
      ctx.fillText(segment.text, currentX, y);
      currentX += ctx.measureText(segment.text).width;
    }
  }

  drawBottomInfoBar(state){
    const ctx = this.ctx;
    const player = state.player;
    const barHeight = state.hud.bottomBarHeight;
    const y = state.height - barHeight;
    const columnRatios = [0.07, 0.13, 0.24, 0.24, 0.14, 0.18];
    const columnWidths = columnRatios.map(ratio => state.width * ratio);
    const columnX = [];
    let currentX = 0;

    for(const width of columnWidths){
      columnX.push(currentX);
      currentX += width;
    }

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
    ctx.fillRect(0, y, state.width, barHeight);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();

    for(let i = 1; i < columnX.length; i++){
      const x = columnX[i];
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x, y + barHeight - 8);
      ctx.stroke();
    }

    this.drawSoundToggleIcon(columnX[0], y, columnWidths[0], barHeight, state);
    this.drawHealthLabel(columnX[1], y, columnWidths[1], barHeight, player);

    const fuelRatio = player.fuel / player.maxFuel;
    const fuelCritical = fuelRatio < 0.2;
    const fuelFlashOn = fuelCritical && Math.floor(state.time * 14) % 2 === 0;

    if(fuelFlashOn){
      ctx.fillStyle = "rgba(255, 77, 109, 0.18)";
      ctx.fillRect(columnX[2], y, columnWidths[2], barHeight);
    }

    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = fuelFlashOn ? "#ffcc44" : "#ffffff";
    ctx.fillText("FUEL", columnX[2] + 18, y + 20);
    this.drawBar(columnX[2] + 18, y + 34, columnWidths[2] - 36, 16, player.fuel, player.maxFuel, this.getFuelBarColor(player));

    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("NITRO [LShift]", columnX[3] + 18, y + 20);
    this.drawBar(columnX[3] + 18, y + 34, columnWidths[3] - 36, 16, player.nitro, player.maxNitro, "#3da9fc");

    this.drawBottomLabel(
      columnX[4],
      y,
      columnWidths[4],
      barHeight,
      "TIME",
      this.formatTime(state.time)
    );

    this.drawUpdateRateLabel(columnX[5], y, columnWidths[5], barHeight, state);

    ctx.restore();
  }

  drawSoundToggleIcon(x, y, width, height, state){
    const ctx = this.ctx;
    const image = state.debug.enableSound ? this.assets.soundOn : this.assets.soundOff;
    const centerX = x + width / 2;
    const iconSize = Math.min(40, height - 18, width - 20);
    const iconY = y + (height - iconSize) / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if(image && image.complete){
      ctx.globalAlpha = state.debug.enableSound ? 1 : 0.65;
      ctx.drawImage(image, centerX - iconSize / 2, iconY, iconSize, iconSize);
    }
    else{
      ctx.fillStyle = state.debug.enableSound ? "#ffffff" : "#777777";
      ctx.font = "bold 24px Arial";
      ctx.fillText(state.debug.enableSound ? "ON" : "OFF", centerX, y + height / 2);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
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

  drawUpdateRateLabel(x, y, width, height, state){
    const ctx = this.ctx;
    const centerX = x + width / 2;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#a256f8";
    ctx.font = "bold 20px Arial";
    ctx.fillText("ASTRO DRIFT", centerX, y + 8);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.fillText(`Change Render  [F]: ${state.runtime.renderHz.toFixed(0)} FPS`, centerX, y + 31);
    ctx.fillText(`Update Physics [G]: ${state.runtime.physicsHz.toFixed(0)} Hz`, centerX, y + 48);
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
      const satelliteImage = satellite.texture ? this.assets[satellite.texture] : null;
      if(satelliteImage && satelliteImage.complete && satelliteImage.naturalWidth > 0){
        console.log("image");
        const size = satellite.radius * 5;
        ctx.save();
        ctx.translate(satellite.position.x, satellite.position.y);
        ctx.rotate(satellite.rotation || 0);
        ctx.drawImage(satelliteImage, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      else{
        ctx.beginPath(); 
        ctx.arc(satellite.position.x, satellite.position.y, satellite.radius, 0, Math.PI * 2);
        ctx.fillStyle = satellite.color; 
        ctx.fill(); 
      }
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(satellite.position.x, satellite.position.y);
      ctx.lineTo(
        satellite.position.x + Math.cos(satellite.rotation || 0) * satellite.radius,
        satellite.position.y + Math.sin(satellite.rotation || 0) * satellite.radius
      );
      ctx.stroke();
      ctx.restore(); 
    }
  }

  drawAsteroids(state){
    const ctx = this.ctx; 
    const image = this.assets.asteroid;

    if(!image.complete) return; 

    for(const asteroid of state.asteroids){
      const width = asteroid.width || (asteroid.radius * 2);
      const height = asteroid.height || (asteroid.radius * 2);
      ctx.save();
      ctx.translate(asteroid.position.x, asteroid.position.y);
      ctx.rotate(asteroid.angle);
      ctx.drawImage(image, -width/2, -height/2, width, height);
      ctx.restore();
    }
  }

  drawDrones(state){
    const ctx = this.ctx; 
    const image = this.assets.drones; 

    if(!image.complete) return; 

    for(const drone of state.drones){
      const width = drone.width || (drone.radius * 2);
      const height = drone.height || (drone.radius * 2);
      ctx.save(); 
      ctx.translate(drone.position.x, drone.position.y);
      ctx.rotate(drone.angle);
      ctx.drawImage(image, -width/2, -height/2, width, height);
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
    ctx.fillStyle = "#a256f8";
    for(const bullet of state.playerBullets){
      ctx.beginPath();
      ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawRigidBodyDebug(state){
    const bodies = [...state.asteroids, ...state.drones, state.player];
    if(state.debug.showColliders){
      this.drawColliders(bodies, state);
    }
    if(state.debug.showMomentumVectors){
      this.drawMomentumVectors(bodies);
      this.drawAngularVelocity(bodies);
      this.drawAngularMomentum(state.asteroids);
    }
  }

  drawAngularMomentum(bodies){
    const ctx = this.ctx; 
    ctx.save();
    ctx.strokeStyle = "#ff00ff";
    ctx.fillStyle = "#ff00ff";
    ctx.lineWidth = 2 ;
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    for(const body of bodies){
      const L = body.getAngularMomentum ? body.getAngularMomentum() : (body.inertia * body.angularVelocity);
      if(Math.abs(L) < 10) continue; 
      const magnitude = Math.log10(Math.abs(L));
      const radius = Math.max(8, magnitude * 4);
      const drawX = body.position.x; // + (body.radius || 20) + 12;
      const drawY = body.position.y; // + (body.radius || 20) - 12;
      ctx.beginPath();
      ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      ctx.stroke();
      if(L > 0){
        // Counter-Clockwise (Poining OUT of Screen: Dot)
        ctx.beginPath();
        ctx.arc(drawX, drawY, radius * 0.3, 0, Math.PI * 2);
      }
      else{
        // Clockwise (Pointing INTO Screen: Cross)
        ctx.beginPath();
        ctx.moveTo(drawX - radius * 0.5, drawY - radius * 0.5);
        ctx.lineTo(drawX + radius * 0.5, drawY + radius * 0.5);
        ctx.moveTo(drawX + radius * 0.5, drawY - radius * 0.5);
        ctx.lineTo(drawX - radius * 0.5, drawY + radius * 0.5);
        ctx.stroke()
      }
      ctx.fillText(`L=${L.toFixed(0)}`, drawX, drawY - radius - 8);
    }
    ctx.restore();
  }

  drawAngularVelocity(bodies){
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#ffcc44";
    ctx.fillStyle = "#ffcc44";
    ctx.lineWidth = 2 ;
    ctx.font = "14px Arial";
    ctx.textAlign = "center";

    for(const body of bodies){
      if(body.angularVelocity === undefined) continue;

      const radius = (body.radius || 20) + 14;
      const direction = Math.sign(body.angularVelocity || 1);
      const startAngle = body.angle; 
      const endAngle = body.angle + (body.angularVelocity * 0.5);

      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, radius, startAngle, endAngle, direction < 0);
      ctx.stroke();
      const arrowX = body.position.x + Math.cos(endAngle) * radius;
      const arrowY = body.position.y + Math.sin(endAngle) * radius;

      ctx.beginPath();
      ctx.arc(arrowX, arrowY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillText(
        `w=${body.angularVelocity.toFixed(2)}`,
        body.position.x, 
        body.position.y - radius - 10
      );
    } 
    ctx.restore();
  }

  drawColliders(bodies, state){
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2; 
    for(const body of bodies){
      ctx.beginPath();
      if(state.debug.useCircleColliders){
        const radius = body.radius || 0; 
        ctx.arc(body.position.x, body.position.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      else{
        if(body.getVertices){
          const vertices = body.getVertices();
          ctx.moveTo(vertices[0].x, vertices[0].y);
          for(let i = 1; i < vertices.length; i++){
            ctx.lineTo(vertices[i].x, vertices[i].y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        else{
          let angle = body.angle || 0; 
          if(body.angle === undefined && body.direction){
            angle = Math.atan2(body.direction.y, body.direction.x);
          } 
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          ctx.rotate(angle);

          if(body.hitboxes && body.hitboxes.length > 0){
            for(const hb of body.hitboxes){
              const drawX = hb.offset.x - (hb.width / 2);
              const drawY = hb.offset.y - (hb.height / 2);
              ctx.rect(drawX, drawY, hb.width, hb.height);
            }
          }
          else{
            const width = body.width || (body.radius * 2);
            const height = body.height || (body.radius * 2);
            ctx.rect(-width / 2, -height / 2, width, height);
          }
          const baseWidth = body.width || (body.radius * 2);
          ctx.moveTo(0, 0);
          ctx.lineTo(baseWidth / 2, 0);
          ctx.stroke();
          ctx.restore();
        }
      }
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
      const momentum = body.getMomentum ? body.getMomentum() : body.velocity.scale(body.mass || 1);
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
