/**
 * Main game loop controller. 
 * 
 * This class manages the execution of the game by repeatedly calling the update 
 * (simulation) and render (drawing) functions. 
 * 
 * It implements a fixed timestep loop with an accumulator to ensure stable and 
 * framerate-independent simulation. 
 * 
 * The simulation runs at a constant rate (switchable between 1/120 and 1/60), while rendering 
 * is performed once per animation frame using requestAnimationFrame. 
 * 
 * It is based on: https://gafferongames.com/post/fix_your_timestep/
 */
export class GameLoop{
  constructor({update, render, input, fixedTimeStep = 1 / 120}){
    this.update = update; 
    this.render = render; 
    this.input = input; 
    this.fixedTimeStep = fixedTimeStep; 

    this.running = false; 
    this.lastTimeStamp = 0; 
    this.accumulator = 0; 

    this.fps = 0; 
    this.fpsFrameCounter = 0; 
    this.fpsElapsed = 0; 

    this.boundFrame = this.frame.bind(this);
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
   * Rendering is performed once per frame using an interpolation factor to smooth visual 
   * transitions between simulation steps. 
   * @param {number} timestamp - current time provided by requestedAnimationFrame
   * @returns 
   */
  frame(timestamp){
    if(!this.running) return; 
    let frameDT = (timestamp - this.lastTimeStamp) / 1000; // how much real time passed since last frame
    this.lastTimeStamp = timestamp; 

    frameDT = Math.min(frameDT, 0.25); // prevents huge jumps
    this.accumulator += frameDT; // store leftover time for simulation

    this.fpsFrameCounter += 1; 
    this.fpsElapsed += frameDT;

    if(this.fpsElapsed >= 1){
      this.fps = this.fpsFrameCounter / this.fpsElapsed; 
      this.fpsFrameCounter = 0; 
      this.fpsElapsed = 0; 
    }

    // Simulation runs at constant rate (120Hz)
    // Independent on rendering FPS
    while(this.accumulator >= this.fixedTimeStep){
      this.update(this.fixedTimeStep, this.fps);
      this.input.endFrame();
      this.accumulator -= this.fixedTimeStep; 
    }

    const interpolationAlpha = this.accumulator / this.fixedTimeStep; // used to smooth rendering between updates
    this.render(interpolationAlpha, this.fps); // render once per frame, rendering is not fixed timestep

    requestAnimationFrame(this.boundFrame); // Browser schedules next frame
  }
}
