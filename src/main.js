import { Game } from "./Game.js";

/**
 * Entry point of the application. 
 * Initializes the canvas, create the game instance 
 * and starts the main game loop. 
 */
function main(){
  const canvas = document.getElementById("gameCanvas");
  if(!(canvas instanceof HTMLCanvasElement)){
    throw new Error("Canvas element #gameCanvas not found.");
  }
  const game = new Game(canvas);
  game.start();
  let musicStarted = false; 
  canvas.addEventListener("mousedown", () => {
    if(!musicStarted && game.state.debug.enableSound){
      game.state.audio.playMusic("background", 0.4);
      musicStarted = true; 
    }
  });
}

main();