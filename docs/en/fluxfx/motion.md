<span id="動きの変化"></span>

# Motion effects

Noise and Vortex accelerate stored velocity. Velocity over Lifetime adds movement directly to position. Try each module separately before combining them.

## Noise

Add **Velocity Update → Add Module → Noise**. It computes acceleration from particle position and elapsed simulation time.

| Setting | Default | Meaning |
| --- | --- | --- |
| Strength | 1 | Acceleration strength; 0 disables the effect |
| Scale | 1 | Spatial frequency; larger values change over shorter distances |
| Speed | 1 | Speed of variation over time |

All values must be nonnegative. Noise combines sine functions rather than generating independent random values each frame. Speed 0 stops time variation, but moving particles can still experience changing acceleration. Scale 0 removes spatial variation.

Try Strength 0.2 with Scale and Speed 1, then increase Strength gradually. Combine with [Drag or Limit Velocity](./forces.md) if speed builds up too much.

## Vortex

Add **Velocity Update → Add Module → Vortex** to accelerate particles tangentially around an axis.

| Setting | Default | Meaning |
| --- | --- | --- |
| Center | `(0, 0, 0)` | A point on the axis |
| Axis | `(0, 1, 0)` | Axis direction |
| Strength | 1 | Nonnegative tangential acceleration strength |

Axis is normalized; increasing its length does not increase strength. Reverse it to reverse direction. A zero or very small axis produces no acceleration, as do particles almost on the axis.

Vortex neither attracts particles toward the center nor constrains them to an orbit. It does not guarantee a constant radius, and acceleration strength does not scale with distance from the axis.

For example, use a Circle in Local space, Center zero, Axis Y, and Strength 0.5. Adjust lifetime or Drag if particles spread too far.

## Velocity over Lifetime

Add **Position Update → Add Module → Velocity over Lifetime**. It combines lifetime-dependent linear movement with orbital and radial movement.

| Setting | Default | Meaning |
| --- | --- | --- |
| Start | `(0, 0, 0)` | Additional velocity at birth |
| End | `(0, 0, 0)` | Additional velocity at the end of life |
| Orbital | `(0, 0, 0)` | Coefficients for motion around each axis |
| Offset | `(0, 0, 0)` | Center of orbital and radial movement |
| Radial | 0 | Outward additional speed; negative values move inward |

All defaults are zero, so adding the module alone does not change movement.

<span id="startとend"></span>

### Start and End

Start and End are linearly interpolated using age divided by lifetime. Start `(0, 0, 0)` and End `(0, 2, 0)` add increasingly upward movement.

This does not replace velocity from Main's Start Speed or Gravity. After normal movement, the interpolated velocity multiplied by elapsed seconds is added to position.

<span id="orbitalとoffset"></span>

### Orbital and Offset

Orbital velocity is the cross product `Orbital × (particle position − Offset)`. Particles farther from the axis receive more additional speed. Orbital `(0, 1, 0)` adds movement around Y; these values are coefficients, not angles in degrees. Changing their signs reverses direction.

The implementation adds velocity-based displacement rather than applying an exact rotation matrix, so large values do not guarantee a constant orbital radius. Offset is the center coordinate, not a displacement applied to each particle. In World space it is a world position.

### Radial

Positive Radial adds outward movement from the center; negative values add inward movement. Particles almost at the center receive no radial movement. A Circle or Sphere makes this effect easier to observe.

<span id="vortexとの違い"></span>

## Comparison with Vortex

| Aspect | Vortex | Orbital in Velocity over Lifetime |
| --- | --- | --- |
| Updated value | Stored velocity | Additional position displacement |
| Effect | Tangential acceleration | Orbital velocity |
| Distance from axis | Does not scale acceleration strength | Increases additional speed |
| Drag and Limit Velocity | Affect the updated velocity | Do not affect this extra movement |

Adjust Start, End, Orbital, and Radial to reduce the added movement. Limit Velocity alone cannot constrain total movement speed.

<span id="比較しながら調整する"></span>

## Compare while tuning

Start with Start Speed 0, lifetime 3 seconds, and only the module being tested enabled. Use low Strength for Noise, emission away from the axis for Vortex, and only Start and End for Velocity over Lifetime.

Ensure Renderer Culling Bounds cover the movement. Preview settings changes regenerate the configuration; Restart to compare motion at the same time.
