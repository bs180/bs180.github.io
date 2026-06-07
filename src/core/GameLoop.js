/**
 * Main game loop controller. 
 * 
 * This class manages the execution of the game by repeatedly calling the update 
 * (simulation) and render (drawing) functions. 
 * 
 * It implements a fixed timestep loop with an accumulator to ensure stable and 
 * framerate-independent simulation. 
 * 
 * The simulation and rendering rates are controlled independently. requestAnimationFrame 
 * still drives timing, while rendering can be throttled to a chosen update rate.
 * 
 * It is based on: https://gafferongames.com/post/fix_your_timestep/
 */
export class GameLoop{
  constructor({update, render, input, fixedTimeStep = 1 / 120, renderRate = 60}){
    this.update = update; 
    this.render = render; 
    this.input = input; 
    this.fixedTimeStep = fixedTimeStep; 
    this.renderTimeStep = 1 / renderRate;

    this.running = false; 
    this.lastTimeStamp = 0; 
    this.accumulator = 0; 
    this.renderAccumulator = 0;

    this.renderFps = 0;
    this.renderFrameCounter = 0;
    this.renderFpsElapsed = 0;

    this.boundFrame = this.frame.bind(this);
  }

  setPhysicsRate(rate){
    this.fixedTimeStep = 1 / rate;
  }

  setRenderRate(rate){
    this.renderTimeStep = 1 / rate;
    this.renderAccumulator = Math.min(this.renderAccumulator, this.renderTimeStep);
  }

  start(){
    if(this.running) return; 
    this.running = true; 
    // https://developer.mozilla.org/en-US/docs/Web/API/Performance/now#:~:text=The%20performance.,in%20Worker%20and%20ServiceWorker%20contexts).
    this.lastTimeStamp = performance.now(); 
    requestAnimationFrame(this.boundFrame);
  }

  stop(){
    this.running = false; 
  }

  /**
   * Main loop function executed every frame via requestedAnimationFrame. 
   * 
   * Measures elapsed real time between frames and accumulates it to perform fixed-step simulation updates. 
   * 
   * The simulation is updated in discrete steps (fixedTimeStep), ensuring consistent 
   * physics and gameplay independent of framerate. 
   * 
   * Rendering is performed when the render accumulator reaches the configured render 
   * timestep, using interpolation to smooth visual transitions between simulation steps. 
   * @param {number} timestamp - current time provided by requestedAnimationFrame
   * @returns 
   */
  frame(timestamp){
    if(!this.running) return; 
    let frameDT = (timestamp - this.lastTimeStamp) / 1000; // how much real time passed since last frame
    this.lastTimeStamp = timestamp; 

    frameDT = Math.min(frameDT, 0.25); // prevents huge jumps
    this.accumulator += frameDT; // store leftover time for simulation
    this.renderAccumulator += frameDT;
    this.renderFpsElapsed += frameDT;

    // Simulation runs at its configured fixed timestep.
    // It remains independent of the throttled render rate.
    while(this.accumulator >= this.fixedTimeStep){
      this.update(this.fixedTimeStep, this.renderFps);
      this.input.endFrame();
      this.accumulator -= this.fixedTimeStep; 
    }

    if(this.renderFpsElapsed >= 1){
      this.renderFps = this.renderFrameCounter / this.renderFpsElapsed;
      this.renderFrameCounter = 0;
      this.renderFpsElapsed = 0;
    }

    if(this.renderAccumulator >= this.renderTimeStep){
      this.renderAccumulator %= this.renderTimeStep;
      this.renderFrameCounter += 1;

      const interpolationAlpha = this.accumulator / this.fixedTimeStep; // used to smooth rendering between updates
      this.render(interpolationAlpha, this.renderFps);
    }

    requestAnimationFrame(this.boundFrame); // Browser schedules next frame
  }
}
