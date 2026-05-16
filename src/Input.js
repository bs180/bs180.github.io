import { Vec2 } from "./math/Vec2.js";
export class Input{
  /**
   * Creates the input manager for keyboard and mouse interaction. 
   * 
   * This class stores the current keyboard state, mouse state, and the path currently 
   * drawn by the user on the canvas. It converts low-level browser events into a form 
   * that can be queried easily by the game logic each frame. 
   * @param {HTMLCanvasElement} canvas - Canvas used for mouse input  
   */
  constructor(canvas){
    this.canvas = canvas;

    this.keysDown = new Set();
    this.keysPressedThisFrame = new Set();
    this.typedText = "";

    this.mouse = {
      screen: new Vec2(),
      leftDown: false,
      justReleased: false,
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    window.addEventListener("keydown", (event) => {
      const key = this.normalizeKey(event.key);
      if(!this.keysDown.has(key)){
        this.keysPressedThisFrame.add(key);
      }

      if(event.key.length === 1){
        this.typedText += event.key;
      }

      this.keysDown.add(key);
    });

    window.addEventListener("keyup", (event) => {
      const key = this.normalizeKey(event.key);
      this.keysDown.delete(key);
    });

    canvas.addEventListener("mousedown", (event) => {
      if(event.button !== 0) return; 
      this.mouse.leftDown = true; 
      this.mouse.screen = this.getMousePos(event);
      this.currentStroke = [this.mouse.screen.clone()];
    });

    canvas.addEventListener("mousemove", (event) => {
      this.mouse.screen = this.getMousePos(event); 
      if(!this.mouse.leftDown) return; 
      const p = this.mouse.screen.clone(); 
      const last = this.currentStroke[this.currentStroke.length - 1];
      if(!last || last.distanceTo(p) >= 8){
        this.currentStroke.push(p);
      }
    });

    window.addEventListener("mouseup", (event) => {
      if(event.button !== 0) return; 

      if(this.mouse.leftDown){
        this.mouse.screen = this.getMousePos(event);
        this.mouse.leftDown = false; 
        this.mouse.justReleased = true;
        
        if(this.currentStroke.length >= 2){
          this.finishedStroke = [...this.currentStroke];
        }
        this.currentStroke = []
      }
    });
  }
    
  /**
   * Normalizes browser key values into a simpler internal format. 
   * Example: the space key is mapped to the string "space" 
   * so the game can compare keys consistently. 
   * @param {string} key - raw key value from KeyboardEvent 
   * @returns {string} normalized key identifier
   */
  normalizeKey(key){
    if (key === " ") return "space";
    return key.toLowerCase();
  }

  /**
   * Converts the mouse position from browser viewport coordinates into canvas coordinates. 
   * getBoundingClientRect() is used to determine the canvas position and displayed size on
   * the page. The coordinates are then scaled to the internal canvas resolution. 
   * @param {MouseEvent} event - Browser mouse event 
   * @returns {Vec2} Mouse position in canvas space
   */
  getMousePos(event){
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
    // When Element and Bitmap are of different sizes: https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width; 
    const scaleY = this.canvas.height / rect.height; 

    return new Vec2(
      (event.clientX - rect.left) * scaleX,
      (event.clientY - rect.top) * scaleY
    );
  }

  /**
   * Checks whether a key is currently being hold down. 
   * This is useful for continuous input, e.g. movement. 
   * @param {string} key - key to test 
   * @returns {boolean} True if the key is currently pressed
   */
  isKeyDown(key){
    return this.keysDown.has(key.toLowerCase());
  }

  /**
   * Checks whether a key was pressed during the current frame only. 
   * This is useful for one-time actions, e.g. toggling pause. 
   * @param {string} key - key to test 
   * @returns {boolean} True if the key was newly pressed this frame
   */
  wasKeyPressed(key){
    return this.keysPressedThisFrame.has(key.toLowerCase());
  }

  /**
   * Resets per-frame input flags
   * 
   * This should be called once at the end of each game loop frame so 
   * one-frame events do not persist into the next frame. 
   */
  endFrame(){
    this.keysPressedThisFrame.clear();
    this.typedText = "";
    this.mouse.justReleased = false;
  } 
}
