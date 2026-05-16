import { Vec2 } from "../math/Vec2.js";
import { CatmullRomSpline } from "../PathInterpol.js";
import { SceneNode } from "../SceneHierarchy.js";
import { RigidBody } from "../RigidBody.js";
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

    // Debug flags for showing technical visualizations during development and demo 
    this.debug = {
      showFPS: true,
      showRawPath: true, 
      showPlaceholderPath: true, 
      showOrbitGuides: true, 
      showDebugText: true,
      showSplinePath: true,
      editingSpline: false,
      rigidBodiesEnabled: false,
      showColliders: false,
      showMomentumVectors: false,
    };

    // Player state: movement, resources, health and cooldown timers 
    this.hud = {
      topBarHeight: 86,
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
      old_position: new Vec2(180, height * 0.5),
      radius: 14, 
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

    this.asteroids = this.createAsteroids(10);

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

    this.star = {
      position: new Vec2(width * 0.5, height * 0.5),
      radius: 34, 
      color: "#ffcc44",
    };

    this.planets = [
      {
        orbitRadius: 170, 
        orbitSpeed: 0.7, 
        angle: 0.4, 
        radius: 26, 
        color: "#d8a14d",
        position: new Vec2(),
      },
      {
        orbitRadius: 290, 
        orbitSpeed: -0.35,
        angle: 1.8, 
        radius: 20, 
        color: "#5fd28d",
        position: new Vec2(),
      },
      {
        orbitRadius: 230, 
        orbitSpeed: -0.1,
        angle: 48, 
        radius: 10, 
        color: "#3d10dd",
        position: new Vec2(),
      },
    ];

    this.moons = [
      {
        orbitRadius: 46,
        orbitSpeed: 1.8,
        angle: 0, 
        radius: 8, 
        color: "#dddddd",
        position: new Vec2(),
        parentPlanetIndex: 0,
      },
      {
        orbitRadius: 60,
        orbitSpeed: -0.3,
        angle: 55, 
        radius: 8, 
        color: "#d11c1c",
        position: new Vec2(),
        parentPlanetIndex: 1,
      },
    ];

    this.satellites = [
      {
        orbitRadius: 20,
        orbitSpeed: 3, 
        angle: 0, 
        radius: 4,
        color: "#ffffff",
        position: new Vec2(),
        parentMoonIndex: 0,
      },
      {
        orbitRadius: 20,
        orbitSpeed: 3, 
        angle: 0, 
        radius: 4,
        color: "#ffffff",
        position: new Vec2(),
        parentMoonIndex: 1,
      },
    ];

    // Scene graph nodes used for hierarchical transformations. 
    // Parent-child relationships define how transforms propagate. 
    this.starNode = new SceneNode({
      object: this.star, 
      localPosition: this.star.position,
    });

    // Planet nodes are children of the star node 
    this.planetNodes = this.planets.map((planet) => {
      return new SceneNode({
        object: planet, 
        parent: this.starNode, 
        localPosition: new Vec2(planet.orbitRadius, 0),
      });
    });

    // Moon nodes are attached to their parent planet nodes
    this.moonNodes = this.moons.map((moon) => {
      return new SceneNode({
        object: moon, 
        parent: this.planetNodes[moon.parentPlanetIndex], 
        localPosition: new Vec2(moon.orbitRadius, 0),
      });
    });

    // Satellite nodes are attached to their parent moon node 
    this.satelliteNodes = this.satellites.map((satellite) => {
      return new SceneNode({
        object: satellite, 
        parent: this.moonNodes[satellite.parentMoonIndex], 
        localPosition: new Vec2(satellite.orbitRadius, 0),
      });
    });

    this.splineEdit = {
      selectedSpline: null,
      selectedIndex: -1,
      radius: 12,
    };
    
    this.enemyBullets = [];
    this.playerBullets = [];
    this.nitroTrail = [];

    this.inputInfo = {
      mouseWorld: new Vec2(),
    };

    this.runtime = {
      fps: 0, 
      frameCount: 0,
      simulationHz: 60,
    };

    this.initialize(); 
  }

  resize(width, height){
    this.width = width;
    this.height = height;

    this.star.position.set(width * 0.5, height * 0.5);
    this.keepEntityInsideBounds(this.player);
    this.updateSceneHierarchy(0);
  }

  keepEntityInsideBounds(entity){
    if(!entity || !entity.position) return;

    const radius = entity.radius || 0;
    const bounds = this.getPlayableBounds(radius);
    entity.position.x = Math.max(radius, Math.min(this.width - radius, entity.position.x));
    entity.position.y = Math.max(bounds.top, Math.min(bounds.bottom, entity.position.y));
  }

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
   * Updates the hierarchical orbit system. 
   * Each object updates its local orbit position first. 
   * Afterwards, the root node propagates world positions through the scene graph
   * star -> planet -> moon -> satellite
   * @param {number} dt - elapsed simulation time step in seconds 
   */
  updateSceneHierarchy(dt){
    // update planet local positions relative to the star
    for(let i = 0; i < this.planets.length; i++){
      const planet = this.planets[i];
      const node = this.planetNodes[i];

      planet.angle += planet.orbitSpeed * dt; 

      node.localPosition.x = Math.cos(planet.angle) * planet.orbitRadius;
      node.localPosition.y = Math.sin(planet.angle) * planet.orbitRadius;
    }

    // update moon local positions relative to their parent planets 
    for(let i = 0; i < this.moons.length; i++){
      const moon = this.moons[i];
      const node = this.moonNodes[i];

      moon.angle += moon.orbitSpeed * dt; 

      node.localPosition.x = Math.cos(moon.angle) * moon.orbitRadius;
      node.localPosition.y = Math.sin(moon.angle) * moon.orbitRadius;
    } 

    // update satellite local positions relative to their parent moons
    for(let i = 0; i < this.satellites.length; i++){
      const satellite = this.satellites[i];
      const node = this.satelliteNodes[i];

      satellite.angle += satellite.orbitSpeed * dt; 

      node.localPosition.x = Math.cos(satellite.angle) * satellite.orbitRadius;
      node.localPosition.y = Math.sin(satellite.angle) * satellite.orbitRadius;
    } 

    this.starNode.updateWorldTransform(); // propagate all local transforms into final world positions
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
  }

  createAsteroids(count){
    const asteroids = [];
    for(let i = 0; i < count; i++){
      const radius = this.randomRange(20, 40);
      const mass = radius * 0.5; 
      asteroids.push(new RigidBody({
        position: new Vec2(
          this.randomRange(radius, this.width - radius), 
          this.randomRange(radius, this.height - radius)
        ), 
        radius, 
        mass, 
        velocity: new Vec2(
          this.randomRange(-120, 120),
          this.randomRange(-120, 120)
        ), 
        angle: this.randomRange(0, Math.PI * 2), 
        angularVelocity: this.randomRange(-2, 2),
        restitution: 0.85,
      }));
    }
    return asteroids;
  }

  /**Helper: random number in range [min, max] */
  randomRange(min, max){
    // Source: https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
    return Math.random() * (max - min) +  min; 
  }
}
