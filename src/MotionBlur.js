export class MotionBlur
{
  constructor(){
    this.enabled = true;
    this.modeOptions = ["Temporal", "Post-Process"];
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

  toggleEnabled(){
    this.enabled = !this.enabled;
  }

  // Helper function for linear interpolation
  // Give me position between a and b based on t (0 to 1)
  lerp(start, end, amount) {
    return start + (end - start) * amount;
  }
  
  drawPlayer(ctx, player, shipImage, shipWidth, shipHeight){
    if(!this.enabled || !player.nitroActive){
      return;
    }

    if(this.blurName === "Post-Process")
    {
      this.postProcessBlur(ctx, player, shipImage, shipWidth, shipHeight)
    }
    else
    {
      this.temporalBlur(ctx, player, shipImage, shipWidth, shipHeight);
    }
  }

 temporalBlur(ctx, player, shipImage, shipWidth, shipHeight)
 {
 
    // The blur samples are distributed regularly between a previous stored position
    //  and the current position.
    //  Each sample is drawn with alpha 1 / n to conserve total energy.”

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

  postProcessBlur(ctx, player, shipImage, shipWidth, shipHeight) 
  {

    const start = player.old_position;
    const end = player.position;

    // Draw the ship at its current position to ensure it's visible in the color buffer
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(player.direction.angle() + Math.PI / 2);
    ctx.drawImage(shipImage, -shipWidth / 2, -shipHeight / 2, shipWidth, shipHeight);
    ctx.restore();

    // Affected region
    const paddingX = shipWidth / 2;
    const paddingY = shipHeight / 2;

    const minX = Math.min(start.x, end.x) - paddingX;
    const maxX = Math.max(start.x, end.x) + paddingX;
    const minY = Math.min(start.y, end.y) - paddingY;
    const maxY = Math.max(start.y, end.y) + paddingY;

    const regionX = Math.floor(minX);
    const regionY = Math.floor(minY);
    const regionRight = Math.ceil(maxX);
    const regionBottom = Math.ceil(maxY);

    const width = regionRight - regionX;
    const height = regionBottom - regionY;
    // Color buffer
    const color_buffer = ctx.getImageData(regionX, regionY, width, height);

    // Velocity vector
    const velocityX = end.x - start.x;
    const velocityY = end.y - start.y;
    
    //Filling velocity buffer with the same velocity for all pixels in the affected region
    const velocity_buffer = [];

    for (let y = 0; y < height; y++) 
    {
      for (let x = 0; x < width; x++) 
      {
        const index = y * width + x;
        const colorIndex = index * 4;

        const alpha = color_buffer.data[colorIndex + 3];

        if (alpha > 0)
        {
          velocity_buffer[index] = {
            vx: velocityX,
            vy: velocityY
          };
        }
        else
        {
          velocity_buffer[index] = {
            vx: 0,
            vy: 0
          };
        }
      }
    }

    const samples = this.blurSamples; // 1, 4, 16, 64

    // Output buffer for blurred image
    const output_buffer = ctx.createImageData(width, height);

    for (let current_position_y = 0; current_position_y < height; current_position_y++) 
    {
      for (let current_position_x = 0; current_position_x < width; current_position_x++) 
      {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let count = 0; // Count of contributing pixels

        const index = current_position_y * width + current_position_x;

        // Look along the velocity direction for pixels that moved over this pixel.
        for(let i = 0; i < samples; i++)
        {
            const t = i / samples;
            const sample_x = Math.round(this.lerp(current_position_x, current_position_x + velocityX, t));
            const sample_y = Math.round(this.lerp(current_position_y, current_position_y + velocityY, t));

            // Check bounds
            if (sample_x < 0 || sample_x >= width ||
                sample_y < 0 || sample_y >= height) 
            {
              continue;
            }

            const sample_index = sample_y * width + sample_x;
            const sample_velocity = velocity_buffer[sample_index];

            if (sample_velocity.vx != 0 || sample_velocity.vy != 0)
            {
                const sampleColorIndex = sample_index * 4;

                r += color_buffer.data[sampleColorIndex];
                g += color_buffer.data[sampleColorIndex + 1];
                b += color_buffer.data[sampleColorIndex + 2];
                a += color_buffer.data[sampleColorIndex + 3];

                count++;
            }
        }

        const outIndex = index * 4;

        if (count > 0) 
        {
          output_buffer.data[outIndex] = r / count;
          output_buffer.data[outIndex + 1] = g / count;
          output_buffer.data[outIndex + 2] = b / count;
          output_buffer.data[outIndex + 3] = a / count;
        }
        else 
        {
          output_buffer.data[outIndex] = color_buffer.data[outIndex];
          output_buffer.data[outIndex + 1] = color_buffer.data[outIndex + 1];
          output_buffer.data[outIndex + 2] = color_buffer.data[outIndex + 2];
          output_buffer.data[outIndex + 3] = color_buffer.data[outIndex + 3];
        }
      }
    }

  ctx.putImageData(output_buffer, regionX, regionY);

  
  }
  
}
