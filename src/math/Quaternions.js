/**
 * A 4D complex number system used to calculate rotations. 
 * Unlike standard Euler angles, quaternions mathematically prevent 
 * "Gimbal Lock" (the loss of a degree of freedom when axes align)
 * In a 2D game, the Gimbal Lock is not a problem. 
 */
export class Quaternion{
  /**
   * W is the scalar part and x,y,z are the vector part 
   */
  constructor(w = 1, x = 0, y = 0, z = 0){
    this.w = w; 
    this.x = x; 
    this.y = y; 
    this.z = z;
  }

  /**
   * Converts a 2D angle (radians) into a 4D quaternion. 
   * Because this is a 2D game, the object only rotates flat against the screen, 
   * meaning the rotation strictly occurs on the z-axis. Therefore, x and y are 
   * locked to 0.
   */
  static fromEulerToQuaternion(angle){
    // Quaternions use half-angles
    const halfAngle = angle * 0.5;
    return new Quaternion(
      Math.cos(halfAngle), 
      0, 
      0, 
      Math.sin(halfAngle)
    );
  }

  /**
   * Extracts the standard 2D angle (radians) back out of the quaternion. 
   * Used for Renderer and other logic.
   */
  getEulerFromQuaternion(){
    return 2 * Math.atan2(this.z, this.w);
  }

  /**
   * The Hamiltonian Product
   * Source: https://www.ljll.fr/~frey/papers/scientific%20visualisation/Shoemake%20K.,%20Quaternions.pdf
   * Multiplies two quaternions together. This is how to combine two rotations. 
   */
  multiply(q){
    return new Quaternion(
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w
    );
  }

  /**
   * Normalizes a quaternion to a length of 1 to represent the rotation. 
   */
  normalize(){
    let length = Math.sqrt(this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z);
    if(length === 0){
      this.w = 1; this.x = 0; this.y = 0; this.z = 0; 
    }
    else{
      this.w /= length; this.x /= length; this.y /= length; this.z /= length;
    }
    return this;
  }
}