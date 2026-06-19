// Pure fixed-timestep accumulator. Splits a variable frame delta into a whole
// number of fixed substeps plus a carried remainder, clamped to avoid the
// "spiral of death" when the frame delta is huge (e.g. after a tab is backgrounded).
export interface StepPlan {
  steps: number;
  remainder: number;
}

export function accumulateSteps(
  carry: number,
  dt: number,
  fixedStep: number,
  maxSteps: number,
): StepPlan {
  let acc = carry + dt;
  let steps = 0;
  while (acc >= fixedStep && steps < maxSteps) {
    acc -= fixedStep;
    steps += 1;
  }
  // If we hit the clamp, drop excess backlog so we don't keep a huge remainder.
  if (steps >= maxSteps && acc >= fixedStep) {
    acc = acc % fixedStep;
  }
  return { steps, remainder: acc };
}
