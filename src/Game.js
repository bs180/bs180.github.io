import { GameState } from "./gameplay/GameState.js";
import { Input } from "./Input.js";
import { Renderer } from "./Renderer.js";
import { GameLoop } from "./core/GameLoop.js";
import { PickupSystem } from "./gameplay/PickupSystem.js";
import { EnemySystem } from "./gameplay/EnemySystem.js";
import { PlayerSystem } from "./gameplay/PlayerSystem.js";
import { AsteroidSystem } from "./gameplay/AsteroidSystem.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { HighscoreScene } from "./scenes/HighscoreScene.js";
import { PauseScene } from "./scenes/PauseScene.js";

/**
 * Central coordinator of the entire game application. 
 * This class initializes all subsystems, manages scenes, 
 * forwards updates to gameplay systems and controls the main 
 * simulation/rendering loop. 
 */
export class Game{
  /**
   * Creates the main game instance and initializes all core systems. 
   * @param {HTMLCanvasElement} canvas - Canvas used for rendering 
   */
  constructor(canvas){
    this.canvas = canvas; 
    this.ctx = canvas.getContext("2d");

    if(!this.ctx){
      throw new Error("Could not create 2D rendering context.")
    }

    this.resizeCanvasToWindow(); 
    //------------------------------------------------------
    // Core game components 
    //------------------------------------------------------
    this.state = new GameState(canvas.width, canvas.height); //Global game state (all game data lives here)
    this.input = new Input(canvas); //Input handler (keyboard + mouse)
  
    this.pickupSystem = new PickupSystem(this.state); 
    this.enemySystem = new EnemySystem(this.state);
    this.playerSystem = new PlayerSystem(this.state);
    this.asteroidSystem = new AsteroidSystem(this.state);

    this.assets = this.loadAssets();

    // Renderer handles all drawing
    this.renderer = new Renderer(this.ctx, this.assets);

    this.playerName = "";
    this.renderRateOptions = [10, 15, 30, 45, 60];
    this.physicsRateOptions = [10, 15, 30, 45, 60];
    this.renderRateIndex = this.renderRateOptions.length - 1;
    this.physicsRateIndex = this.physicsRateOptions.length - 1;

    // Initialize scenes
    this.menuScene = new MenuScene(canvas.width, canvas.height, this.assets);
    this.highscoreScene = new HighscoreScene(canvas.width, canvas.height, this.assets);
    this.pauseScene = new PauseScene(canvas.width, canvas.height);
    this.currentScene = "menu"; // "menu", "gameplay", "pause", or "highscore"

    // Game loop setup 
    this.loop = new GameLoop({
      update: this.update.bind(this), 
      render: this.render.bind(this),
      input: this.input, 
      fixedTimeStep: 1 / this.physicsRateOptions[this.physicsRateIndex],
      renderRate: this.renderRateOptions[this.renderRateIndex],
    });

    window.addEventListener("resize", () => {
      this.resize();
    });
  }

  /** 
   * Starts the game loop.
   */ 
  start(){
    this.resize();
    this.loop.start(); 
  }

  /**
   * Resizes the canvas to match the current browser window size 
   */
  resizeCanvasToWindow(){
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * updates all game and scene dimensions after a window resize 
   */
  resize(){
    this.resizeCanvasToWindow();

    this.state?.resize(this.canvas.width, this.canvas.height);
    this.resizeScene(this.menuScene);
    this.resizeScene(this.highscoreScene);
    this.resizeScene(this.pauseScene);
  }

  /**
   * resizes a scene to match the curent canvas dimensions
   * @param {Object} scene  
   */
  resizeScene(scene){
    if(!scene) return;
    scene.width = this.canvas.width;
    scene.height = this.canvas.height;
  }

  /**
   * Opens the highscore scene after the player dies. 
   */
  showGameOverHighscore(){
    this.highscoreScene.showGameOver(this.state.time, this.playerName);
    this.currentScene = "highscore";
    this.state.audio.stopMusic();
  }

  /**
   * Loads all image assets used by the game. 
   * Assets originate from the Kenney "Space Shooter Remastered" pack.
   * https://kenney.nl/assets/space-shooter-remastered
   * @returns {Object} collection of loaded image assets
   */
  loadAssets(){
    const assets = {
      ship: new Image(),
      shipBlue: new Image(),
      shipGreen: new Image(),
      fuel: new Image(),
      nitro: new Image(),
      asteroid: new Image(),
      drones: new Image(),
      soundOn: new Image(),
      soundOff: new Image(),
      menuBackground: new Image(),
      sun: new Image(),
      earth: new Image(),
      venus: new Image(),
      moon: new Image(),
      mars: new Image(),
      jupiter: new Image(),
      satellite: new Image(),
    }

    assets.ship.src = "../res/images/spaceships/playerShip1_purple.png";
    assets.shipBlue.src = "../res/images/spaceships/playerShip1_blue.png";
    assets.shipGreen.src = "../res/images/spaceships/playerShip1_green.png";
    assets.fuel.src = "../res/images/power-ups/powerupGreen_bolt.png";
    assets.nitro.src = "../res/images/power-ups/pill_blue.png";
    assets.asteroid.src = "../res/images/asteroids/meteorBrown_big1.png";
    assets.drones.src = "../res/images/enemies/enemyBlack1.png";
    assets.soundOn.src = "../res/images/ui/sound_on.png";
    assets.soundOff.src = "../res/images/ui/sound_off.png";
    assets.menuBackground.src = "../res/images/ui/background.png";
    assets.sun.src = "../res/images/planets/sun.png";
    assets.earth.src = "../res/images/planets/earth.png";
    assets.venus.src = "../res/images/planets/venus.png";
    assets.moon.src = "../res/images/planets/moon.png";
    assets.satellite.src = "../res/images/planets/satellit.png";
    assets.jupiter.src = "../res/images/planets/jupiter.png";
    assets.mars.src = "../res/images/planets/mars.png";

    return assets;
  }

  /**
   * Main simulation update function. 
   * handles scene updates, gameplay systems, 
   * runtime statistics and debug interaction. 
   */
  update(dt, fps){
    this.updateRuntimeStats(fps);
    this.state.inputInfo.mouseWorld.copy(this.input.mouse.screen);

    if(this.updateCurrentScene(dt)) return; 
    this.handleToggleInput();
    this.handleSplineEditing();

    if(this.state.paused) return; 
    this.state.time += dt; 
    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
    this.state.asteroidWarningTime = Math.max(0, this.state.asteroidWarningTime - dt);

    this.state.updateSceneHierarchy(dt);
    this.playerSystem.update(dt, this.input);
    this.enemySystem.update(dt);
    this.pickupSystem.update(dt);
    this.asteroidSystem.update(dt);
    
    if(this.state.gameOver){
      this.showGameOverHighscore();
    }
  }

  /**
   * Updates runtime statistics displayed in the debug HUD
   * @param {number} fps - current measured rendering frame rate
   */
  updateRuntimeStats(fps){
    this.state.runtime.fps = fps; 
    this.state.runtime.frameCount += 1;
    this.state.runtime.physicsHz = 1 / this.loop.fixedTimeStep;
    this.state.runtime.simulationHz = this.state.runtime.physicsHz;
    this.state.runtime.renderHz = 1 / this.loop.renderTimeStep;
  }

  /**
   * Updates the currently active scene. 
   * Returns true if a menu-like scene handled the update, 
   * preventing gameplay systems from updating simultaniously. 
   * 
   * @param {number} dt 
   * @returns {boolean} True if scene handling consumed the update 
   */
  updateCurrentScene(dt){
    if(this.currentScene === "menu"){
      const action = this.menuScene.update(dt, this.input);
      if(action === "start"){
        this.playerName = this.menuScene.getPlayerName();
        this.state.reset();
        this.currentScene = "gameplay";
      }
      else if(action === "highscore"){
        this.playerName = this.menuScene.getPlayerName();
        this.highscoreScene.showHighscores();
        this.currentScene = "highscore";
      }
      return true;
    }
    if(this.currentScene === "highscore"){
      const action = this.highscoreScene.update(dt, this.input);
      if(action === "play_again"){
        this.state.reset();
        this.currentScene = "gameplay";
      }
      else if(action === "main_menu" || action === "back_to_menu"){
        this.state.reset();
        this.currentScene = "menu";
      }
      return true; 
    }
    if(this.currentScene === "pause"){
      const action = this.pauseScene.update(dt, this.input);
      if(action === "continue"){
        this.state.paused = false; 
        this.currentScene = "gameplay";
      }
      else if(action === "main_menu"){
        this.state.paused = false; 
        this.currentScene = "menu";
      }
      return true;
    }
    return false; 
  }

  /**
   * Main render function 
   * Depending on the acive scene, either gameplay rendering 
   * or menu/highscore rendering is performed. 
  */
  render(interpolationAlpha, fps){
    this.state.runtime.fps = fps; 
    
    if(this.currentScene === "menu"){
      this.menuScene.render(this.ctx);
      return;
    }

    if(this.currentScene === "highscore"){
      if(this.highscoreScene.gameOverInfo){
        const wasGameOver = this.state.gameOver;
        this.state.gameOver = false;
        this.renderer.render(this.state, interpolationAlpha);
        this.state.gameOver = wasGameOver;
      }

      this.highscoreScene.render(this.ctx);
      return;
    }

    if(this.currentScene === "pause"){
      this.renderer.render(this.state, interpolationAlpha);
      this.pauseScene.render(this.ctx);
      return;
    }

    this.renderer.render(this.state, interpolationAlpha);
  }

  /**
   * Handles one-time key inputs (toggles, debug features) 
   */
  handleToggleInput(){
    if(this.input.wasKeyPressed("Escape")){
      this.state.paused = true;
      if(this.state.paused) this.state.audio.pauseMusic();
      else this.state.audio.resumeMusic();
      this.currentScene = "pause";
      return;
    }
    if(this.input.wasKeyPressed("p")){
      this.state.paused = !this.state.paused;
      if(this.state.paused) this.state.audio.pauseMusic();
      else this.state.audio.resumeMusic();
    } 
    if(this.input.wasKeyPressed("3")) this.renderer.motionBlur.toggleEnabled();
    if(this.input.wasKeyPressed("4")) this.state.debug.showOrbitGuides = !this.state.debug.showOrbitGuides; 
    if(this.input.wasKeyPressed("t")) this.state.debug.showOrbitGuides = !this.state.debug.showOrbitGuides; 
    if(this.input.wasKeyPressed("i")) this.state.pathInterpolation.traversalSpeed = Math.min(4, this.state.pathInterpolation.traversalSpeed + 0.25);
    if(this.input.wasKeyPressed("k")) this.state.pathInterpolation.traversalSpeed = Math.max(0.25, this.state.pathInterpolation.traversalSpeed - 0.25);
    if(this.input.wasKeyPressed("j")) this.state.pathInterpolation.updateRate = Math.max(10, this.state.pathInterpolation.updateRate - 10);
    if(this.input.wasKeyPressed("l")) this.state.pathInterpolation.updateRate = Math.min(200, this.state.pathInterpolation.updateRate + 10);
    if(this.input.wasKeyPressed("1")) this.state.debug.showSplinePath = !this.state.debug.showSplinePath;
    if(this.input.wasKeyPressed("o")){
      this.state.nitroSpline.generateRandomControlPoints(this.state.width, this.state.height, 5, 80);
      this.state.nitroPickup.progress = 0;
      this.state.nitroPickup.direction = 1;
      this.state.nitroPickup.position.copy(this.state.nitroSpline.getPoint(0));
    }

    if(this.input.wasKeyPressed("f")){
      this.renderRateIndex = (this.renderRateIndex + 1) % this.renderRateOptions.length;
      this.loop.setRenderRate(this.renderRateOptions[this.renderRateIndex]);
      this.state.runtime.renderHz = this.renderRateOptions[this.renderRateIndex];
    }

    if(this.input.wasKeyPressed("g")){
      this.physicsRateIndex = (this.physicsRateIndex + 1) % this.physicsRateOptions.length;
      this.loop.setPhysicsRate(this.physicsRateOptions[this.physicsRateIndex]);
      this.state.runtime.physicsHz = this.physicsRateOptions[this.physicsRateIndex];
      this.state.runtime.simulationHz = this.state.runtime.physicsHz;
    }

    if(this.input.wasKeyPressed("m")) this.renderer.motionBlur.nextBlurMode();
    if(this.input.wasKeyPressed("n")) this.renderer.motionBlur.nextBlurSampleCount();

    if(this.input.wasKeyPressed("2")) this.state.debug.rigidBodiesEnabled = !this.state.debug.rigidBodiesEnabled;
    if(this.input.wasKeyPressed("c")) this.state.debug.showColliders = !this.state.debug.showColliders;
    if(this.input.wasKeyPressed("v")) this.state.debug.showMomentumVectors = !this.state.debug.showMomentumVectors;
    if(this.input.wasKeyPressed("b")) this.state.debug.useCircleColliders = !this.state.debug.useCircleColliders;
    if(this.input.wasKeyPressed("5") || this.isSoundToggleClicked()){
      this.toggleSound();
    } 
    if(this.input.wasKeyPressed("q")) this.state.debug.useQuaternions = !this.state.debug.useQuaternions;
    //deactivate for now since we only have one mode
    //if(this.input.wasKeyPressed("r")){
    //  this.state.reset();
    //}
  }

  toggleSound(){
    this.state.debug.enableSound = !this.state.debug.enableSound;
    this.state.audio.setSoundEnabled(this.state.debug.enableSound);
  }

  isSoundToggleClicked(){
    if(!this.input.mouse.justReleased) return false;

    const mouse = this.input.mouse.screen;
    const barHeight = this.state.hud.bottomBarHeight;
    const y = this.state.height - barHeight;
    const width = this.state.width * 0.07;

    return (
      mouse.x >= 0 &&
      mouse.x <= width &&
      mouse.y >= y &&
      mouse.y <= this.state.height
    );
  }

  /**
   * Handles runtime spline control point editing using the mouse. 
   * Control points can be selected and dragged interactively to 
   * modify the Catmull-Rom spline during gameplay. 
   */
  handleSplineEditing(){
    const mouse = this.input.mouse.screen; 
    const edit = this.state.splineEdit;
    const splines = [this.state.nitroSpline];

    if(this.input.mouse.leftDown && edit.selectedSpline === null){
      for(const spline of splines){
        if(!spline) continue;

        const index = this.findControlPointAt(mouse, spline.getControlPoints(), edit.radius);
        if(index !== -1){
          edit.selectedSpline = spline;
          edit.selectedIndex = index; 
          this.state.debug.editingSpline = true;
          break;
        }
      }
    }

    if(this.input.mouse.leftDown && edit.selectedSpline !== null){
      const points = edit.selectedSpline.getControlPoints();
      const p = points[edit.selectedIndex];
      p.x = mouse.x; 
      p.y = mouse.y;
      edit.selectedSpline.rebuild();
    }
    if(!this.input.mouse.leftDown){
      edit.selectedSpline = null;
      edit.selectedIndex = -1;
      this.state.debug.editingSpline = false;
    }
  }

  /**
   * finds a control pont near the mouse cursor. 
   * Used for spline editing (click detection).
   */
  findControlPointAt(mouse, points, radius){
    const radiusSquared = radius * radius; 

    for(let i = 0; i < points.length; i++){
      const dx = mouse.x - points[i].x; 
      const dy = mouse.y - points[i].y;

      if(dx * dx + dy * dy <= radiusSquared){
        return i; 
      }
    }
    return -1;
  }
}
