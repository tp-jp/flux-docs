# Shape

Shape controls spawn positions and initial velocity directions. Main's Start Speed sets the magnitude. Axes and shapes below are described in the emitter's local coordinates.

<span id="形状を選ぶ"></span>

## Choose a shape

| Type | Spawn positions | Settings |
| --- | --- | --- |
| Point | A single point | None |
| Sphere | Inside a sphere | Radius |
| Hemisphere | Inside the +Y hemisphere | Radius |
| Circle | Inside a disk on the XZ plane | Radius |
| Box | Inside a centered box | Size |
| Cone | Inside the base disk on the XZ plane | Radius, Angle |

Sphere, Hemisphere, and Circle fill their interiors rather than just the surface or outline. Cone spawns from its base disk with cone-shaped directions, not throughout the cone volume.

<span id="radiusとsize"></span>

## Radius and Size

Radius is the nonnegative radius of the sphere, hemisphere, or disk. It changes the spawn region, not initial speed.

Box Size specifies the full width along each of the X, Y, and Z axes, with nonnegative components. `(2, 1, 4)` spans ±1 on X, ±0.5 on Y, and ±2 on Z from its center.

<span id="初速度の方向"></span>

## Initial velocity direction

Sphere uses spherical directions; Hemisphere uses +Y hemispherical directions; Circle uses radial directions in XZ. Cone spreads around +Y. Point and Box use random directions over the whole sphere; Box directions are not necessarily outward from each spawn position.

Rotate the emitter GameObject to orient the effect. Use positive Start Speed to compare positions and directions in preview.

<span id="coneのangle"></span>

## Cone Angle

Angle is the spread from the center axis in degrees. At 0, particles move parallel to +Y; increasing it widens the spread.

The valid range is **0 inclusive to 90 exclusive**. Even if the Inspector slider permits 90, generation rejects it.

Radius controls base width; Angle controls direction spread. Reduce both for a narrow jet, or use a large Radius with Angle 0 for parallel emission over a wide disk.

<span id="シミュレーション空間との関係"></span>

## Simulation space

Local keeps particle coordinates relative to the emitter. World transforms position and velocity at spawn time. Use World to leave spawned particles behind as the emitter moves, or Local when existing particles should follow the object.

Shape defines initial conditions. Use force, Noise, Vortex, or other modules to change the path after spawning.

<span id="確認の手順"></span>

## Compare shapes

Start with no modules, Start Speed 1, and a short lifetime. Change Type first, then Radius or Size, then speed and lifetime. Scene-view gizmos also help visualize spawn regions.
