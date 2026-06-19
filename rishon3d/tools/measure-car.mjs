// Headless measurement of the car's top speed/acceleration, mirroring src/entities/Car.ts.
// Run: node tools/measure-car.mjs
import RAPIER from "@dimforge/rapier3d-compat";

await RAPIER.init();

function runSim(engineForce, mass, frictionSlip, seconds = 6) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  // ground
  const gb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(RAPIER.ColliderDesc.cuboid(200, 0.1, 200).setTranslation(0, -0.1, 0), gb);

  // chassis (same as Car.ts)
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.0, 0).setCanSleep(false),
  );
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.9, 0.3, 1.8).setMass(mass), body);

  const vehicle = world.createVehicleController(body);
  const wheels = [
    [-0.9, -0.2, 1.3], [0.9, -0.2, 1.3], [-0.9, -0.2, -1.3], [0.9, -0.2, -1.3],
  ];
  const susDir = { x: 0, y: -1, z: 0 };
  const axleCs = { x: -1, y: 0, z: 0 };
  wheels.forEach(([x, y, z], i) => {
    vehicle.addWheel({ x, y, z }, susDir, axleCs, 0.4, 0.35);
    vehicle.setWheelSuspensionStiffness(i, 24);
    vehicle.setWheelMaxSuspensionTravel(i, 0.3);
    vehicle.setWheelFrictionSlip(i, frictionSlip);
  });

  const dt = 1 / 60;
  const steps = Math.floor(seconds / dt);
  let topSpeed = 0;
  let speedAt1s = 0;
  for (let s = 0; s < steps; s++) {
    vehicle.setWheelEngineForce(2, engineForce);
    vehicle.setWheelEngineForce(3, engineForce);
    world.timestep = dt;
    vehicle.updateVehicle(dt);
    world.step();
    const v = body.linvel();
    const speed = Math.hypot(v.x, v.z);
    if (speed > topSpeed) topSpeed = speed;
    if (s === Math.floor(1 / dt)) speedAt1s = speed;
  }
  return { engineForce, mass, frictionSlip, speedAt1s, topSpeed };
}

const rows = [
  runSim(65, 150, 2.0),    // old (felt very slow)
  runSim(350, 150, 2.0),   // chosen fix
];
console.log("engineForce  mass  friction  speed@1s(m/s)  topSpeed(m/s)  topSpeed(km/h)");
for (const r of rows) {
  console.log(
    String(r.engineForce).padEnd(11),
    String(r.mass).padEnd(5),
    String(r.frictionSlip).padEnd(8),
    r.speedAt1s.toFixed(2).padEnd(13),
    r.topSpeed.toFixed(2).padEnd(13),
    (r.topSpeed * 3.6).toFixed(1),
  );
}
