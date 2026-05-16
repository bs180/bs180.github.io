/**
 * Simple 2D vector class used for position, directions and velocities. 
 * 
 * This class provides basic vector math operations that are used throughout 
 * the assignment, e.g. movement, collision checks and rotations. 
 */
export class Vec2{
  constructor(x = 0, y = 0){
    this.x = x; 
    this.y = y; 
  }

  /**Returns a copy of this vector */
  clone(){
    return new Vec2(this.x, this.y);
  }

  /**Sets both components of the vector */
  set(x, y){
    this.x = x; 
    this.y = y; 
    return this;
  }

  /**Copies values from another vector */
  copy(v){
    this.x = v.x; 
    this.y = v.y; 
    return this; 
  }

  /**Used for adding to vectors together (this + v) and returns new vector */
  add(v){
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  /**Used for subtracting to vectors (this - v) and returns new vector */
  sub(v){
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  /**Used for scaling the vector and returns new vector */
  scale(s){
    return new Vec2(this.x * s, this.y * s);
  }

  /**Returns the length (magnitude) of the vector */
  length(){
    return Math.hypot(this.x, this.y);
  }

  /**Returns the squared length of the vector */
  lengthSquared(){
    return this.x * this.x + this.y * this.y;
  }

  /**Returns a normalized (unit length) vector */
  normalized(){
    const len = this.length();
    if (len == 0) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }

  /**Returns the distance between two vectors */
  distanceTo(v){
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  /**Returns the angle of the vector in radians */
  angle(){
    return Math.atan2(this.y, this.x);
  }
}
