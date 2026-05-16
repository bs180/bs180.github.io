export function isColliding(a, b){
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;

  const radiusSum = a.radius + b.radius;

  return dx * dx + dy * dy <= radiusSum * radiusSum;
}