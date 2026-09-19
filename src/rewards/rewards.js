export function computeReward(first, moves, quiet, daily) {
  let reward = first ? 8 : 2;
  if (daily) reward += 10;
  const efficient = quiet != null && moves <= quiet;
  if (efficient) reward += 5;
  if (first && moves <= 2) reward += 2;
  return { reward, efficient };
}
