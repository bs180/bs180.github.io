import { Vec2 } from "../math/Vec2.js";

// fast boolean check to see if two circles are touching
// Source: https://stackoverflow.com/questions/8331243/circle-collision-in-javascript
export function isColliding(a, b){
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;

  const radiusSum = a.radius + b.radius;

  // use square distance for optimization, sqrt is expensive
  return dx * dx + dy * dy <= radiusSum * radiusSum;
}

/**
 * Calculates the exact physical overlap between two circular bodies.
 * Returns the normal and penetration 
 */
export function getCircleCollision(a, b){
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;

  const distanceSquared = dx * dx + dy * dy;
  const radiusSum = (a.radius || 0) + (b.radius || 0);

  // if they are further apart than their combined radii, no collision.
  if(distanceSquared >= radiusSum * radiusSum) return null;

  // distance is used for penetration depth
  const distance = Math.sqrt(distanceSquared);

  // when they spawn on top of each other
  // normal points up so the physics engine knows which way to push them apart
  if(distance === 0){
    return {
      normal: new Vec2(0, 1),
      penetration: radiusSum,
    };
  }

  // normal is normalized vector pointing from b to a
  return {
    normal: new Vec2(dx / distance, dy / distance),
    penetration: radiusSum - distance,
  };
}


//---------------------------------------------------
// For the SAT implementation, we got inspired by the 
// Youtuber GamesWithGabe. Especially the video 
// Separating Axis Theorem EXPLAINED | Coding a 2D Physics Engine in Java #11 
// (Link: https://www.youtube.com/watch?v=Nm1Cgmbg5SQ&t=5s) 
// helped us by implementing our version of the SAT. 
// Instead of only returning true or false for "are they colliding"
// our approach also returns the collision normal and penetration depth.
//---------------------------------------------------


/**
 * Extracts the 4 corners of a rotated rectangle in world-space coordinates. 
 * If the entity already has a custom shape (hitboxes of player), it uses that instead
 */
function getVerticesFromEntity(entity){
  // if the object provided its own explicit corners, just use those
  if(typeof entity.getVertices === "function"){
    return entity.getVertices();
  }
  // otherwise, assume it's a standard rectangle and calculate the corners from its center
  const w = entity.width || (entity.radius * 2);
  const h = entity.height || (entity.radius * 2);
  const angle = entity.angle || 0; 
  const pos = entity.position; 

  const halfW = w / 2; 
  const halfH = h / 2; 

  // 4 corners in local space (center of object is 0,0)
  const corners = [
    new Vec2(-halfW, -halfH),
    new Vec2(halfW, -halfH),
    new Vec2(halfW, halfH),
    new Vec2(-halfW, halfH)
  ];

  let cos, sin; 
  if(entity.useQuaternions && entity.orientation){
    const q = entity.orientation;
    // For a unit quaternion q = (w, x, y, z)
    // the rotation matrix is: https://www.songho.ca/opengl/gl_quaternion.html
    // Since we apply a 2D rotation this reduces to (set x = y = 0): 
    // R = [1 - 2z^2       -2wz  ]
    //     [  2wz        1 - 2z^2]
    // w^2 + x^2 + y^2 + z^2 = 1 (since x = y = 0) 
    // we get 1 = w^2 + z^2
    // and therefore: 
    // R = [w^2 - z^2       -2wz  ]
    //     [  2wz        w^2 - z^2]
    // Comparing that with the normal 2D rotation matrix: 
    // R = [cos(theta)        -sin(theta)]
    //     [sin(theta)         cos(theta)] 
    // Therefore we know: cos = w^2 - z^2 and sin = 2 * w * z

    cos = (q.w * q.w) - (q.z * q.z);
    sin = 2 * q.w * q.z;
  }
  else {
    cos = Math.cos(angle);
    sin = Math.sin(angle);
  }

  // rotate each corner using a 2D rotation matrix, then shift it to its actual world position
  return corners.map(c => {
    const rotatedX = c.x * cos - c.y * sin; 
    const rotatedY = c.x * sin + c.y * cos;
    return new Vec2(pos.x + rotatedX, pos.y + rotatedY);
  });
}

/**
 * Separating Axis Theorem (SAT)
 * The core algorithm for checking if two convex polygons overlap. 
 * Intuitive Concept (Flashlight and Shadows):
 * Imagine shining a flashlight at the two shapes from different angles.
 * If you can find even ONE  angle where their shadows don't overlap, they are 
 * definitely NOT colliding. If their shadows overlap from EVERY angle, they MUST 
 * collide. Mathematically, the "shadow" is created by projecting the 2D corners of the 
 * shapes onto a 1D axis using the Dot product. This collapses the complex shapes into 
 * simple 1D numbe lines (a min and max value). If those min/max intervals overlap on 
 * every perpendicular axis, a collision is occuring. 
 */
export function getOBBCollision(a, b){
  const verticesA = getVerticesFromEntity(a);
  const verticesB = getVerticesFromEntity(b); 

  let smallestOverlap = Infinity; 
  let smallestAxis = null; 

  // we only need to shine the flashlight perpendicular to the edges of the shapes
  const axes = [...getAxes(verticesA), ...getAxes(verticesB)];

  for(const axis of axes){
    // project both shapes onto the current axis (cast their shadows)
    const projectionA = projectVertices(verticesA, axis);
    const projectionB = projectVertices(verticesB, axis);

    // calculate how much the two 1D shadows overlap
    const overlap = Math.min(projectionA.max, projectionB.max) - Math.max(projectionA.min, projectionB.min);

    // if there is no overlap on this axis, we found a gap -> not colliding
    if(overlap <= 0){
      return null;
    }
    // we keep track of the axis with the smallest shadow overlap.
    // in physics, objects resolve collisions by taking the path of least resistance. 
    // The smallest overlap represents the absolute shortest distance to push them apart.
    if(overlap < smallestOverlap){
      smallestOverlap = overlap; 
      smallestAxis = axis; 
    }
  }

  // Ensure the collision normal always points from b to a. 
  // If it points the wrong way, the physics engine will suck them together instead of bouncing them
  const centerDelta = a.position.sub(b.position);
  if(centerDelta.x * smallestAxis.x + centerDelta.y * smallestAxis.y < 0){
    smallestAxis = smallestAxis.scale(-1);
  }
  return {
    normal: smallestAxis, 
    penetration: smallestOverlap,
  };
}

/**
 * Calculates the perpendicular normal for every edge of a shape
 */
function getAxes(vertices){
  const axes = [];
  for(let i = 0; i < vertices.length; i++){
    const current = vertices[i];
    // loop back to the first vertex if we are on the last one
    const next = vertices[(i + 1) % vertices.length];
    // get the vector of the edge itself
    const edge = next.sub(current);
    // to get the perpendicular normal of a 2D vector, you flip them and negate one
    const axis = new Vec2(-edge.y, edge.x).normalized();
    axes.push(axis);
  }
  return axes;
}

/**
 * Calculates the 1D "shadow" of a 2D shape on a given axis.
 * It mathematically destroys the 2D coordinates, collapsing 
 * them into a single 1D number line.
 */
function projectVertices(vertices, axis){
  let min = Infinity; 
  let max = -Infinity;

  for(const vertex of vertices){
    // dot product projects the 2D vertex onto the 1D axis
    const projection = vertex.x * axis.x + vertex.y * axis.y; 
    // find the lowest and highest points of the shadow
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }
  return {min, max};
}

/**
 * Identifies exactly which corner of an object chreash into the other object. 
 * This is crucial for rigid body physics: hitting the corner of a box applies torque,
 * while hitting the center of a box onyl applies linear force.
 */
export function getContactPoint(a, b, normal){
    const verticesA = getVerticesFromEntity(a);
    const verticesB = getVerticesFromEntity(b);

    let bestPoint = null; 
    let bestDistance = Infinity; 

    // look at all corners of object a
    for(const v of verticesA){
      // measure how far this corner is from the center of b along the collision normal
      const distance = Math.abs((v.x - b.position.x) * normal.x + (v.y - b.position.y) * normal.y);
      if(distance < bestDistance){
        bestDistance = distance; 
        bestPoint = v; // the point deepest into the other object is our contact point
      }
    }

    // same approach for corners of object b
    for(const v of verticesB){
      const distance = Math.abs((v.x - a.position.x) * normal.x + (v.y - a.position.y) * normal.y);
      if(distance < bestDistance){
        bestDistance = distance; 
        bestPoint = v; 
      }
    }
    return bestPoint; 
  }
