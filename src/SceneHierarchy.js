import { Vec2 } from "./math/Vec2.js";
/**
 * Scene graph node used for hierarchical transformations 
 * Each node stores a local transformation relative to its parent. 
 * World-space transformations are comptued recursively by propagating 
 * parent transformations through the hierarchy.
 */
export class SceneNode{
  /**
   * Creates new scene graph node.
   * @param {Object} options - Node configuration object. 
   * @param {Object|null} options.object - optional attached game object
   * @param {SceneNode|null} options.parent - parent node in the hierarchy 
   * @param {Vec2} options.localPosition - local positnion relative to the parent 
   * @param {number} options.localRotation - local rotation relative to the parent 
   */
  constructor({object = null, parent = null, localPosition = new Vec2(), localRotation = 0}){
    this.object = object; // optional game object associated with this node 
    this.parent = parent; // parent node ini the hierarchy 
    this.children = []; // list of child nodes 

    // local transformation relative to the parent 
    this.localPosition = localPosition; 
    this.localRotation = localRotation;

    // computed world-space transformation
    this.worldPosition = new Vec2(); 
    this.worldRotation = 0; 

    // Automatically register this node as a child of the parent
    if(parent){
      parent.children.push(this);
    }
  }

  /**
   * Recursively computes the world-space transformation 
   * for this node and all child nodes. 
   * Parent transformations are propagated through the hierarchy, 
   * allowing child objects to inherit orbital movement. 
   */
  updateWorldTransform(){
    // Non-root nodes inherit transformations form their parent 
    if(this.parent){
      // rotation matrix components derived from the parents world rotation.
      const cos = Math.cos(this.parent.worldRotation);
      const sin = Math.sin(this.parent.worldRotation);

      // rotate the local offset using the parents rotation
      const rotatedLocalPosition = new Vec2(this.localPosition.x * cos - this.localPosition.y * sin, this.localPosition.x * sin + this.localPosition.y * cos);

      // combine rotated local offset with the parents world position
      this.worldPosition = this.parent.worldPosition.add(rotatedLocalPosition);
      // accumulate parent and local rotations 
      this.worldRotation = this.parent.worldRotation + this.localRotation; 
    }
    // root ndoes already exist in world space 
    else{
      this.worldPosition = this.localPosition.clone(); 
      this.worldRotation = this.localRotation; 
    }

    // copy the computed world position to the attached game object
    if(this.object && this.object.position){
      this.object.position.copy(this.worldPosition);
    }

    // recursively udpate all child nodes
    for(const child of this.children){
      child.updateWorldTransform();
    }
  }
}