export class MotionBlur{
  constructor(){
    this.modeOptions = ["Temporal", "Stochastic"];
    this.modeIndex = 0;
    this.blurSampleOptions = [1, 4, 16, 64];
    this.blurSampleIndex = 1;
    this.blurMinDistance = 2;
  }

  //For UI
  get blurName(){
    return this.modeOptions[this.modeIndex];
  }

  get blurSamples(){
    return this.blurSampleOptions[this.blurSampleIndex];
  }

  nextBlurMode(){
    this.modeIndex = (this.modeIndex + 1) % this.modeOptions.length;
  }

  nextBlurSampleCount(){
    this.blurSampleIndex =
      (this.blurSampleIndex + 1) % this.blurSampleOptions.length;
  }

  // Helper function for linear interpolation
  // Give me position between a and b based on t (0 to 1)
  lerp(start, end, amount) {
    return start + (end - start) * amount;
  }
  
  drawPlayer(ctx, player, shipImage, shipWidth, shipHeight, baseAlpha = 1){
    if(!player.nitroActive){
      return;
    }

    if(this.blurName === "Stochastic")
    {
      this.stochasticBlur(ctx, player, shipImage, shipWidth, shipHeight)
    }
    else
    {
      this.temporalBlur(ctx, player, shipImage, shipWidth, shipHeight);
    }
  }

temporalBlur(ctx, player, shipImage, shipWidth, shipHeight)
{
 
    // The blur samples are distributed regularly between a previous stored position and the current position.
    //  Each sample is drawn with alpha 1 / n to conserve total intensity.”

    const start = player.old_position; // t-1 position
    const end = player.position;       // t position
    const n = this.blurSamples;

    for(let i = 1; i <= n; i++)
    {
      const t = i / n;      // Distribute samples evenly between 0 and 1
      
      const x = this.lerp(start.x, end.x, t);
      const y = this.lerp(start.y, end.y, t);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(player.direction.angle() + Math.PI / 2);
      
      ctx.globalAlpha = 1 / n; // Each sample has alpha 1/n to keep total intensity consistent
      ctx.drawImage(shipImage, -shipWidth / 2, -shipHeight / 2, shipWidth, shipHeight);
      ctx.restore();
    }
}


  stochasticBlur(ctx, player, shipImage, shipWidth, shipHeight) 
  {
    const start = player.old_position;
    const end = player.position;
    const samples = this.blurSamples;

    for (let i = 0; i < samples; i++) {
      const t = Math.random();

      const x = this.lerp(start.x, end.x, t);
      const y = this.lerp(start.y, end.y, t);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(player.direction.angle() + Math.PI / 2);

      ctx.globalAlpha = 1 / samples;

      ctx.drawImage(shipImage, -shipWidth / 2, -shipHeight / 2, shipWidth, shipHeight);
      ctx.restore();
    }

  }

}
