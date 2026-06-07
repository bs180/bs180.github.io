import { Vec2 } from "../math/Vec2.js";
import { CatmullRomSpline } from "../PathInterpol.js";
import { SceneNode } from "../SceneHierarchy.js";
import { SoundSystem } from "./SoundSystem.js";
/**
 * Stores the complete mutable runtime state of the game..
 * This class acts as a central container for gameplay data, rendering data, debug flags
 * and scene object properties. It is created once when the game starts and then updated 
 * continuously during the game loop. 
 */
export class GameState{
  /**
   * Initializes the game state. 
   * The constructor defines the screen size, global game values, debug flags, player 
   * properties, celestial objects, path data, input-related data and runtime statistics 
   * such as FPS. 
   * @param {number} width - width of the game canvas
   * @param {number} height - height of the game canvas
   */
  constructor(width, height){
    this.width = width; 
    this.height = height; 

    // Global flags and timer values
    this.paused = false; 
    this.gameOver = false; 

    this.time = 0; 
    this.score = 0; 

    this.audio = new SoundSystem();
    // Sounds created with: https://sfxr.me/ 
    // Source background music: https://opengameart.org/content/space-boss-battle-theme
    // Creator: Matthew Pablo
    this.audio.loadSound("shoot", "../res/audio/laserShoot.wav");
    this.audio.loadSound("asteroid_hit", "../res/audio/hitHurt.wav");
    this.audio.loadSound("explosion", "../res/audio/explosion.wav");
    this.audio.loadSound("pickup", "../res/audio/powerUp.wav");
    this.audio.loadSound("nitro", "../res/audio/Pickup1.wav");
    this.audio.loadSound("background", "../res/audio/Orbital Colossus.mp3");

    // Debug flags for showing technical visualizations during development and demo 
    this.debug = {
      showOrbitGuides: false, 
      showSplinePath: false,
      editingSpline: false,
      rigidBodiesEnabled: true,
      showColliders: false,
      showMomentumVectors: false,
      useCircleColliders: false,
      enableSound: true,
      useQuaternions: true,
    };

    this.audio.setSoundEnabled(this.debug.enableSound);

    // Player state: movement, resources, health and cooldown timers 
    this.hud = {
      topBarHeight: 104,
      bottomBarHeight: 64,
    };

    this.pathInterpolation = {
      traversalSpeed: 1,
      updateRate: 100,
    };

    //Player position
    this.player = {
      position: new Vec2(180, height * 0.5), 
      velocity: new Vec2(0, 0),
      direction: new Vec2(1, 0), 
      old_position: new Vec2(180, height * 0.5), // used for verlet integration or visual interpolation
      radius: 25, 
      width: 50,
      height: 50,
      // rectangles to create a better contouring
      hitboxes: [
        {offset: new Vec2(0, 8), width: 50, height: 18}, // main horizontal body
        {offset: new Vec2(0, 0), width: 18, height: 50} // vertical center body
      ],
      speed: 220, 
      fuel: 100, 
      maxFuel: 100, 
      nitro: 0, 
      maxNitro: 100, 
      nitroActive: false,
      health: 3, 
      maxHealth: 3,
      hitCooldown: 0,
      healthFlashTime: 0,
      pickupVisualTime: 0,
      pickupVisualDuration: 0.5,
      pickupShipColor: "purple",
      pickupCooldown: 0,
      shootCooldown: 0, 
      shootInterval: 0.25,
    };

    // Static fuel pickup. Unlike the nitro pickup, fuel is placed randomly 
    // and does not move along a spline 
    this.fuelPickup = {
      position: new Vec2(),
      radius: 14,
    };
    this.fuelPickup.position.set(80 + Math.random() * (width - 160), 80 + Math.random() * (height - 160));

    // Moving nitro pickup. Its position is updated along a Catmull-Rom spline 
    this.nitroPickup = {
      position: new Vec2(), 
      direction: 1, 
      radius: 14, 
      speed: 0.45, 
      progress: 0,
    };
    this.nitroSpline = new CatmullRomSpline();
    this.nitroSpline.generateRandomControlPoints(this.width, this.height, 5, 80);
    this.nitroPickup.position.copy(this.nitroSpline.getPoint(0));

    this.asteroids = [];
    this.asteroidSpawnTimer = 0;
    this.asteroidSpawnInterval = 15;
    this.asteroidWarningTime = 0;
    this.maxAsteroids = 10;

    this.initialDrones = [
      {
        position: new Vec2(1050, 180), 
        radius: 16, 
        speed: 80, 
        angle: 0, 
        shootCooldown: 0, 
        shootInterval: 1.5,
      },
      {
        position: new Vec2(780, 570), 
        radius: 16, 
        speed: 70, 
        angle: 0, 
        shootCooldown: 0.8, 
        shootInterval: 2,
      },
    ];

    this.drones = this.initialDrones.map(d => ({...d, position: d.position.clone()}));

    this.star = {position: new Vec2(width * 0.5, height * 0.5), radius: 34, color: "#ffcc44",};

    this.planets = [
      {orbitRadius: 135, orbitSpeed: 0.7, angle: 0.4, radius: 18, color: "#d8a14d", texture: "venus", position: new Vec2(),},
      {orbitRadius: 210, orbitSpeed: -0.35, angle: 1.8, radius: 20, color: "#5fd28d", texture: "earth", position: new Vec2(),},
      {orbitRadius: 280, orbitSpeed: -0.1, angle: 1.4, radius: 17, color: "#a24ff0", texture: "mars", position: new Vec2(),},
      {orbitRadius: 360, orbitSpeed: 0.78, angle: 0.92, radius: 28, color: "#b31313", texture: "jupiter", position: new Vec2(),},
    ];

    this.moons = [
      {orbitRadius: 32, orbitSpeed: 1.8, angle: 0, radius: 5, color: "#0aeaf6", texture: "moon", position: new Vec2(), parentPlanetIndex: 0,},
      {orbitRadius: 42, orbitSpeed: -1.2, angle: 0.5, radius: 6, color: "#bebebe", texture: "moon", position: new Vec2(), parentPlanetIndex: 1,},
      {orbitRadius: 30, orbitSpeed: -2, angle: 0.8, radius: 5, color: "#bb1a1a", texture: "moon", position: new Vec2(), parentPlanetIndex: 2,},
      {orbitRadius: 58, orbitSpeed: -4, angle: 0.8, radius: 12, color: "#ad9b9b", texture: "moon", position: new Vec2(), parentPlanetIndex: 3,},
    ];

    this.satellites = [
      {orbitRadius: 14, orbitSpeed: 3, angle: 0, radius: 4, color: "#ffffff", texture: "satellite", position: new Vec2(), parentMoonIndex: 0,},
      {orbitRadius: 16, orbitSpeed: 3, angle: 0, radius: 4, color: "#ffffff", texture: "satellite", position: new Vec2(), parentMoonIndex: 1,},
      {orbitRadius: 22, orbitSpeed: 3, angle: 0, radius: 4, color: "#ffffff", texture: "satellite", position: new Vec2(), parentMoonIndex: 2,},
    ];

    // Scene Graph Hierarchy 
    // By building a tree (Parent - Child - Grandchild), we can move the sun 
    // and the earth, moon, and satellites will automatically drag along with it.
    this.starNode = new SceneNode({
      object: this.star, 
      localPosition: this.star.position,
    });

    this.orbitNodes = [];
    this.planetNodes = [];
    this.moonNodes = [];
    this.satelliteNodes = [];

    // build planets
    for(const planet of this.planets){
      // 1. the orbit pivot: placed exactly at the sun's center
      // it acts as an invisible anchor that spins
      const orbitPivot = new SceneNode({
        parent: this.starNode, 
        localPosition: new Vec2(0, 0),
        localRotation: planet.angle,
      });
      orbitPivot.orbitSpeed = planet.orbitSpeed;
      this.orbitNodes.push(orbitPivot);

      // 2. the planet node: attached to the invisible pivot, pushed outwards by orbitRadius
      // when the invisible pivot spins, this node naturally swings in a giant circle.
      const planetNode = new SceneNode({
        object: planet, 
        parent: orbitPivot, 
        localPosition: new Vec2(planet.orbitRadius, 0),
        localRotation: 0,
      });
      planetNode.spinSpeed = 1.0; 
      this.planetNodes.push(planetNode);
    }

    // build moons (same logic, but their parent is a planet)
    for(const moon of this.moons){
      const parentPlanetIndex = this.planetNodes[moon.parentPlanetIndex];
      const orbitPivot = new SceneNode({
        parent: parentPlanetIndex,
        localPosition: new Vec2(0, 0),
        localRotation: moon.angle,
      });
      orbitPivot.orbitSpeed = moon.orbitSpeed;
      this.orbitNodes.push(orbitPivot);
      const moonNode = new SceneNode({
        object: moon, 
        parent: orbitPivot, 
        localPosition: new Vec2(moon.orbitRadius, 0),
        localRotation: 0,
      });
      moonNode.spinSpeed = 2.0;
      this.moonNodes.push(moonNode);
    }

    // build satellites (parent is moon)
    for(const satellite of this.satellites){
      const parentMoonNode = this.moonNodes[satellite.parentMoonIndex];
      const orbitPivot = new SceneNode({
        parent: parentMoonNode,
        localPosition: new Vec2(0,0),
        localRotation: satellite.angle,
      });
      orbitPivot.orbitSpeed = satellite.orbitSpeed;
      this.orbitNodes.push(orbitPivot);
      const satelliteNode = new SceneNode({
        object: satellite, 
        parent: orbitPivot, 
        localPosition: new Vec2(satellite.orbitRadius, 0),
        localRotation: 0,
      });
      satelliteNode.spinSpeed = 3.0;
      this.satelliteNodes.push(satelliteNode);
    }
    
    // UI and engine state trackers
    this.splineEdit = {selectedSpline: null, selectedIndex: -1, radius: 12,};
    this.enemyBullets = [];
    this.playerBullets = [];
    this.nitroTrail = [];
    this.inputInfo = {mouseWorld: new Vec2(),};
    this.runtime = {fps: 0, frameCount: 0, renderHz: 60, physicsHz: 60, simulationHz: 60,};
    this.initialize(); 
  }

  /**
   * Adjusts the game bounds if the browser window is resized
   */
  resize(width, height){
    this.width = width;
    this.height = height;

    this.star.position.set(width * 0.5, height * 0.5);
    this.keepEntityInsideBounds(this.player);
    this.updateSceneHierarchy(0);
  }

  /**
   * Hard limits an entity's coordinates so tehy cannot fly under the UI bars
   */
  keepEntityInsideBounds(entity){
    if(!entity || !entity.position) return;

    const radius = entity.radius || 0;
    const bounds = this.getPlayableBounds(radius);
    entity.position.x = Math.max(radius, Math.min(this.width - radius, entity.position.x));
    entity.position.y = Math.max(bounds.top, Math.min(bounds.bottom, entity.position.y));
  }

  /**
   * Helper to fetch the actual safe playing space by subtracting HUD heights
   */
  getPlayableBounds(radius = 0){
    return {
      top: this.hud.topBarHeight + radius,
      bottom: this.height - this.hud.bottomBarHeight - radius,
    };
  }

  /**
   * Performs initial setup steps after the state object is created. 
   * Currently, it computes the initial positions of the orbiting bodies 
   * so planets and moon are placed correctly before the first rendered frame. 
   */
  initialize(){
    this.updateSceneHierarchy(0);
  }

  /**
   * Core execution of the Scene Graph. 
   * Walks down the tree computing exact screen coordinates. 
   * @param {number} dt - elapsed simulation time step in seconds 
   */
  updateSceneHierarchy(dt){
    // update local rotations based on speed and time
    for(const pivot of this.orbitNodes) pivot.localRotation += pivot.orbitSpeed * dt;
    for(const p of this.planetNodes) p.localRotation += p.spinSpeed * dt;
    for(const m of this.moonNodes) m.localRotation += m.spinSpeed * dt;
    for(const s of this.satelliteNodes) s.localRotation += s.spinSpeed * dt;

    // the star updates, which tells its children to update, which tells their children to update,...
    this.starNode.updateWorldTransform();
    // save trajectories for orbital trails
    this.updateHierarchyTrajectories(dt); 
  } 

  /**
   * Saves past positions to draw trails behind planets. 
   * uses life/age system so trails fade away over exactly 2 seconds
   * @param {number} dt 
   */
  updateHierarchyTrajectories(dt){
    const maxTrajectoryAge = 2.0;
    const bodies = [...this.planets, ...this.moons, ...this.satellites,];

    for(const body of bodies){
      if(!body.trajectory){
        body.trajectory = [];
      }
      // save where it is right now
      body.trajectory.push({
        position: body.position.clone(),
        age: 0,
      });

      // age all existing points
      for(const point of body.trajectory){
        point.age += dt;
      }
      // culls points that are too old
      body.trajectory = body.trajectory.filter(point => point.age <= maxTrajectoryAge);
    }
  }

  /**Reset function
   * Used for resetting the game parameters, flags and states. 
   */
  reset(){
    this.paused = false; 
    this.gameOver = false;
    this.time = 0; 
    this.timeLeft = 60; 
    this.score = 0; 
    this.pathInterpolation.traversalSpeed = 1;
    this.pathInterpolation.updateRate = 100;

    this.player.position = new Vec2(180, this.height * 0.5);
    this.player.old_position = this.player.position.clone();
    this.player.velocity = new Vec2(0, 0);
    this.player.direction = new Vec2(1, 0);
    this.player.fuel = this.player.maxFuel; 
    this.player.nitro = 0;
    this.player.nitroActive = false;
    this.player.health = this.player.maxHealth;
    this.player.hitCooldown = 0; 
    this.player.pickupCooldown = 0; 
    this.player.shootCooldown = 0; 
    this.player.healthFlashTime = 0;
    this.player.pickupVisualTime = 0;
    this.player.pickupVisualDuration = 0.5;
    this.player.pickupShipColor = "purple";

    this.enemyBullets = [];
    this.playerBullets = [];
    this.nitroTrail = [];

    this.fuelPickup.position.set(80 + Math.random() * (this.width - 160), 80 + Math.random() * (this.height - 160));

    this.nitroSpline.generateRandomControlPoints(this.width, this.height, 5, 80);

    this.nitroPickup.progress = 0; 
    this.nitroPickup.direction = 1; 
    this.nitroPickup.position.copy(this.nitroSpline.getPoint(0));

    this.debug.editingSpline = false; 
    this.splineEdit.selectedIndex = -1;
    this.splineEdit.selectedSpline = null;

    this.drones = this.initialDrones.map(d => ({...d, position: d.position.clone()}));
    this.asteroids = [];
    this.asteroidSpawnTimer = 0;
    this.asteroidWarningTime = 0;
    this.audio.playMusic("background");
  }

  /**Helper: random number in range [min, max] */
  randomRange(min, max){
    // Source: https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
    return Math.random() * (max - min) +  min; 
  }
}
