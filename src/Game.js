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
    this.frameRateOptions = [10, 15, 30, 45, 60];
    this.frameRateIndex = this.frameRateOptions.length - 1;

    // Initialize scenes
    this.menuScene = new MenuScene(canvas.width, canvas.height);
    this.highscoreScene = new HighscoreScene(canvas.width, canvas.height);
    this.pauseScene = new PauseScene(canvas.width, canvas.height);
    this.currentScene = "menu"; // "menu", "gameplay", "pause", or "highscore"

    // Game loop setup 
    this.loop = new GameLoop({
      update: this.update.bind(this), 
      render: this.render.bind(this),
      input: this.input, 
      fixedTimeStep: 1 / this.frameRateOptions[this.frameRateIndex],
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
   * Opens the highscore scene after a finished game 
   * and initializes the name entry screen. 
   * @param {number} time 
   */
  showHighscoreWithNewScore(time) {
    this.highscoreScene.startNameEntry(time, this.playerName);
    this.currentScene = "highscore";
  }

  /**
   * Opens the highscore scene after the player dies. 
   */
  showGameOverHighscore(){
    this.highscoreScene.showGameOver(this.state.time, this.playerName);
    this.currentScene = "highscore";
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
    }

    assets.ship.src = "../res/images/spaceships/playerShip1_purple.png";
    assets.shipBlue.src = "../res/images/spaceships/playerShip1_blue.png";
    assets.shipGreen.src = "../res/images/spaceships/playerShip1_green.png";
    assets.fuel.src = "../res/images/power-ups/powerupGreen_bolt.png";
    assets.nitro.src = "../res/images/power-ups/pill_blue.png";
    assets.asteroid.src = "../res/images/asteroids/meteorBrown_big1.png";
    assets.drones.src = "../res/images/enemies/enemyBlack1.png";

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
   * @param {number} fps - current rendering frame rate
   */
  updateRuntimeStats(fps){
    this.state.runtime.fps = fps; 
    this.state.runtime.frameCount += 1;
    this.state.runtime.simulationHz = 1 / this.loop.fixedTimeStep;
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
      this.currentScene = "pause";
      return;
    }
    if(this.input.wasKeyPressed("p")) this.state.paused = !this.state.paused;
    if(this.input.wasKeyPressed("t")) this.state.debug.showOrbitGuides = !this.state.debug.showOrbitGuides; 
    if(this.input.wasKeyPressed("1")) this.state.debug.showSplinePath = !this.state.debug.showSplinePath;
    if(this.input.wasKeyPressed("2")) this.state.nitroSpline.generateRandomControlPoints(this.state.width, this.state.height, 5, 80);
    if(this.input.wasKeyPressed("i")) this.state.pathInterpolation.traversalSpeed = Math.min(4, this.state.pathInterpolation.traversalSpeed + 0.25);
    if(this.input.wasKeyPressed("k")) this.state.pathInterpolation.traversalSpeed = Math.max(0.25, this.state.pathInterpolation.traversalSpeed - 0.25);
    if(this.input.wasKeyPressed("j")) this.state.pathInterpolation.updateRate = Math.max(10, this.state.pathInterpolation.updateRate - 10);
    if(this.input.wasKeyPressed("l")) this.state.pathInterpolation.updateRate = Math.min(200, this.state.pathInterpolation.updateRate + 10);

    if(this.input.wasKeyPressed("f")){
      this.frameRateIndex = (this.frameRateIndex + 1) % this.frameRateOptions.length;
      this.loop.fixedTimeStep = 1 / this.frameRateOptions[this.frameRateIndex];
      this.state.runtime.simulationHz = this.frameRateOptions[this.frameRateIndex];
    }

    if(this.input.wasKeyPressed("b")) this.renderer.motionBlur.nextBlurMode();
    if(this.input.wasKeyPressed("n")) this.renderer.motionBlur.nextBlurSampleCount();

    if(this.input.wasKeyPressed("r")) this.state.debug.rigidBodiesEnabled = !this.state.debug.rigidBodiesEnabled;
    if(this.input.wasKeyPressed("c")) this.state.debug.showColliders = !this.state.debug.showColliders;
    if(this.input.wasKeyPressed("v")) this.state.debug.showMomentumVectors = !this.state.debug.showMomentumVectors;

    //deactivate for now since we only have one mode
    //if(this.input.wasKeyPressed("r")){
    //  this.state.reset();
    //}
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
