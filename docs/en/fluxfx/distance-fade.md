# Distance Fade

Fade rendering as the camera moves away from the system. Add it through **Modules → Rendering → Add Module → Distance Fade** in the Authoring Inspector. It does not remove particles or stop simulation.

## Settings {#settings}

| Field | Default | Meaning |
| --- | --- | --- |
| Start Distance | 5 | Distance at which fading starts; at least 0 |
| End Distance | 10 | Distance at which fading completes; at least 0 |
| Target | Rgb | Attenuate RGB brightness or Alpha opacity |

The factor is 1 at or below Start Distance and 0 at or beyond End Distance, with a smoothstep transition between them. **No fade is applied when End Distance is less than or equal to Start Distance.**

Distance is measured from the system origin to the camera and divided by the scale factor, including the effect of parent objects. This supports uniform scale, where all three axes have the same scale factor; individual particle positions are not used. With a combined scale of `(2, 2, 2)`, the default start and end correspond to world-space distances of 10 and 20. Different scale factors on the three axes are not supported.

Choose Target for the [Renderer blend mode](./renderer.md). Rgb attenuates RGB only; Alpha attenuates Alpha only. Reducing Alpha will not hide rendering with a blend mode that ignores Alpha.

## Try it {#try-it}

1. Add the module to a System that displays particles as described in the [Quick start](./quickstart.md). To make distances easy to check in this example, set Scale to `(1, 1, 1)` on the System and all parent objects.
2. Set Start Distance to 5 and End Distance to 10, and choose a Target appropriate for the blend mode.
3. Play Preview in a perspective Scene view and move the camera away from the system origin.

Orthographic cameras do not fade. Stereo rendering uses the midpoint between the eyes. Becoming transparent does not guarantee reduced simulation or rendering work; do not use this as a replacement for stopping or culling effects.

## Change settings at runtime {#runtime}

Access `target.Modules.DistanceFade`. Extension methods use `TpLab.Flux.FX.Udon.Modules`; the Target enum is `TpLab.Flux.FX.Udon.FluxParticleDistanceFadeTarget`.

| Getter / setter | Setting |
| --- | --- |
| GetStartDistance / SetStartDistance | Start distance |
| GetEndDistance / SetEndDistance | End distance |
| GetTarget / SetTarget | Rgb or Alpha |
| GetEnabled / SetEnabled | Enabled state |

All support Live changes, including the corresponding Authoring Inspector fields in Play Mode. Exit Play Mode to edit saved initial settings. See [Runtime API](./runtime-parameters.md) for null and setter-result checks.

See the [reference](./custom-module-reference.md#input-appearance) for combining this with custom color operations.
