# Data and execution model {#data-and-execution}

Custom modules declare when calculations run, what is stored, and which values are read, as well as the formulas themselves. Building on [Architecture](./architecture.md), this page explains the design and validation rules. See [Custom modules](./custom-modules.md) for the complete file creation walkthrough.

## Design decisions {#design}

| Decision | Mechanism |
| --- | --- |
| Calculate at spawn, update, or rendering time | Operation Phase |
| Retain a result per particle across updates | State Value initialized during Spawn |
| Recalculate from inputs when needed | Value supplied by a Provider |
| Expose a setting for users to change | Parameter declared in a Contract |
| Consume another operation's result | ReadVersion and Operation dependencies |

For example, CustomLift makes strength and direction Parameters and modifies the existing velocity state Value during Update. It reads time from a Provider. No custom state Value is needed.

## Phases and particle lifecycle {#phases}

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/fluxfx-phase-flow-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-phase-flow-en-light.svg" alt="Spawn initializes new particles; Update processes other living particles. Stored state is read in later steps and by Render." width="480" height="514" /></a>
  <a class="diagram-dark" href="../../diagrams/fluxfx-phase-flow-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-phase-flow-en-dark.svg" alt="Spawn initializes new particles; Update processes other living particles. Stored state is read in later steps and by Render." width="480" height="514" /></a>
</div>

| Phase | Target | Typical processing |
| --- | --- | --- |
| `Spawn` | Particles spawned in this update | Initialize state and store settings evaluated at spawn |
| `Update` | Existing particles alive at the start of the update | Update velocity, position, and other state |
| `Render` | Rendering evaluation | Calculate color, size, rotation, and UVs |

GPU update processing branches to Spawn for spawn targets, or to Update for other living particles. **A newly spawned particle does not receive both Spawn and Update in the same step.** Initialize custom state required from birth during Spawn instead of waiting for Update.

Standard liveness is `particle.age >= 0` and `particle.age < particle.lifetime`. Core manages age and expiration, marking particles dead when their lifetime is reached. Becoming dead does not automatically zero every component of custom Values. Set values during Spawn when a slot is reused.

Render is evaluation inside the rendering shader, not a function called exactly once per simulation update. Design accumulation and persistent state changes in Spawn and Update. Dependencies cannot cross Phase boundaries.

## Value storage and ownership {#values}

A Value has an ID, type, write policy, and owner. When adding a custom Value with `context.AddValue`, use the Definition's Module ID as its owner. You cannot redefine standard Values or register a new Value owned by another Module.

| Usage | Declaration and constraints |
| --- | --- |
| Stored state | Written by Spawn or Update. Requires Spawn initialization and cannot also have a Provider |
| Provider-supplied value | Read with `Provided`; register its supply mechanism separately |
| Render-local value | Passed between Render Operations. Writing back to state written by Spawn or Update is prohibited |

Writing a custom Value only during Update produces `Missing Spawn initializer`. Declaring a read version alone does not create a Buffer or initial value.

### Write policies {#write-policy}

| WritePolicy | Who can write |
| --- | --- |
| `SystemManaged` | Core only, such as standard age and spawn key |
| `OwnerManaged` | Operations with the same Owner ID as the Value |
| `SharedMutable` | Multiple Operations, with writer order specified |
| `ReadOnly` | No Operation writes; for example, Provider-supplied values |

Use `OwnerManaged` for state updated only within your module, and `SharedMutable` when other modules may also update it. `SharedMutable` does not automatically place conflicting operations in a safe order.

## Supplying values through Providers {#providers}

A Value definition and its Provider are separate registrations. A `Provided` read requires a Provider, and duplicate Providers for the same Value are rejected.

| ProviderKind | Supply mechanism | Constraints |
| --- | --- | --- |
| `Uniform` | Shared Shader Property | A declaration alone does not supply runtime values. Existing execution code sets standard values such as time |
| `SpawnInput` | Spawn input texture | Available only during Spawn |
| `Derived` | HLSL calculation from input Values and Parameters | Register inputs and Parameters used. Provider dependency cycles are prohibited |
| `LookupTable` | Baked data lookup | Available only during Render. Input must be Float; output is Float or Float4 matching the samples |

Registering a custom Uniform does not make Executor automatically set an arbitrary ID. User-editable settings should normally be Parameters.

Derived HLSL has a different calling convention from Operation HLSL. An Operation receives a generated Context. A Derived function receives input Values in declaration order, followed by Parameters, and returns its result. If an input Provider is spawn-only, a Derived Provider using it cannot be used during Update or Render either.

`FluxParticleModuleContribution.NormalizedAge`, `Curve`, and `Gradient` register a Value and Provider together using custom IDs. Curve and Gradient use LookupTable, so use them during Render. For registering standard `step.time`, see the [CustomLift Definition](./custom-modules.md#definition).

## Declaring reads and writes {#reads-and-writes}

An Operation's `reads` specify inputs, `writes` outputs, and `parameters` the settings it uses. Declare the necessary values so that the fields used in HLSL are generated in the Context.

<div class="development-figure">
  <a class="diagram-light" href="../../diagrams/fluxfx-operation-data-en-light.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-operation-data-en-light.svg" alt="Read Values, Provider-supplied Values, and Parameters feed the Context. Operation HLSL calculates results and writes declared output Values." width="480" height="670" /></a>
  <a class="diagram-dark" href="../../diagrams/fluxfx-operation-data-en-dark.svg" target="_blank" rel="noopener" title="Open full-size diagram"><img src="/diagrams/fluxfx-operation-data-en-dark.svg" alt="Read Values, Provider-supplied Values, and Parameters feed the Context. Operation HLSL calculates results and writes declared output Values." width="480" height="670" /></a>
</div>

The diagram shows input and output relationships; an Operation does not need every input category. Available ReadVersions and Providers depend on the Phase, and Render outputs do not write back to particle state.

| ReadVersion | Value read |
| --- | --- |
| `StepPrevious` | State at the start of Update. Valid only during Update |
| `AfterOperation` | Result written by a specified Operation in the same Phase |
| `Committed` | State after simulation. Valid only during Render |
| `Provided` | Provider-supplied value, subject to the Phase constraints of the Provider and its inputs |

Pass an Operation ID as the third argument for `AfterOperation`. That operation must write the requested Value; `contribution.Operation` adds the required dependency. Velocity and rendering color pipelines reconnect inputs to preceding writers, so also read [Execution pipelines](./custom-module-reference.md#operation-pipelines).

| WriteKind | Meaning and constraints |
| --- | --- |
| `Initialize` | Spawn initialization. All Spawn writes must use this kind |
| `Replace` | Replace a value. Used outside Spawn |
| `Modify` | Update based on a read value. Used outside Spawn |

`Modify` does not automatically generate an addition formula. Declare the necessary inputs in `reads` and calculate in HLSL. When multiple writers change the same Value in the same Phase, establish their order through dependencies.

### Operations controlled by Enabled {#enabled}

An Operation with `switchable: true` requires Enabled in its Contract. It must be in Update or Render, use `Modify` for every write, and explicitly read each Value it writes.

When disabled, the generated code skips the HLSL function call and preserves input values. It does not reset them to zero. Disabling CustomLift stops acceleration but preserves accumulated velocity. Disabled Modules are still collected and validated, so disabling a module cannot bypass invalid declarations.

## Designing Parameters {#parameters}

A Parameter is a setting supplied to system calculations, not per-particle state. Define its semantic type and input constraints in a Contract, then Bind the Module value as its initial value in the Definition.

### Types and validation {#parameter-types}

| Contract type | Computation type |
| --- | --- |
| Float | Float |
| Vector2, Vector3, Vector4 | Float2, Float3, Float4 |
| Color | Float4 |
| Bool, Enum | Float, with allowed values validated by the Contract |

Specify `ApiName` and `Policy` in the Contract. Numeric constraints include `Minimum`, `Maximum`, and `Range`; use `Integer` for integer values and `OrderedComponents` for ordered range components. Use `AllowedValues` to restrict Enum values; when omitted, values declared in the enum are permitted. NaN and Infinity are rejected.

Place necessary constraints in the Contract as well as Inspector attributes. They validate initial values during Bind and changes through Handles. Invalid initial values cause generation errors; runtime Set methods report failure through their return values. Do not assume automatic clamping.

### Change policies {#parameter-policies}

| Policy | Changes and effects |
| --- | --- |
| `Static` | Cannot change after Executor's first valid Step call. Pause or Stop alone does not remove this restriction |
| `Live` | Can change at runtime; subsequent evaluations use the new value. Effects on existing particles depend on the consuming operation |
| `SpawnLocked` | Designed to retain the result evaluated at spawn in particle state. New particles use changed settings |

A `Live` Parameter read only during Spawn does not change stored values of existing particles. Design both whether it can change and which Phase reads it.

`SpawnLocked` does not automatically create per-particle storage merely by setting the policy. Evaluate the Parameter in a Spawn Operation and store the result in a custom Value with `Initialize`; read that Value afterward. Direct references to SpawnLocked Parameters from Update or Render Operations, or Providers used by them, are rejected because materialization into state is required.

### Connecting Contracts to Handles {#parameter-bindings}

1. Add the stored setting to the Module.
2. Declare its unique ID, type, constraints, and policy in the Contract, mapping it to a shared enum slot.
3. Bind it in the Definition and include it in the Parameter list of the consuming Operation or Provider.
4. Mark entries unused in the current configuration with `UnavailableParameter`, then call `Complete()`.
5. Use the same enum slot and computation type in the Handle, and check Set return values.

Enum slots must be contiguous from zero. Every slot in the Contract requires Bind or UnavailableParameter. Multiple Set calls are not atomic; accepted changes remain if another change fails.

## Checking the design {#checks}

See [Validation and performance](./validation-and-performance.md) for debugging steps and behavior checks.

See the [reference](./custom-module-reference.md#hlsl-conventions) for HLSL function signatures and Context naming.

Check that custom state has Spawn initialization, Provider inputs are valid for the Phase, and each writer's order is defined. Test Enabled changes and Parameter changes separately for existing and newly spawned particles.

See [Custom modules](./custom-modules.md) for implementation steps, [Value IDs](./custom-module-reference.md#standard-value-ids) for standard inputs, and [Operation IDs and execution order](./custom-module-reference.md#standard-operation-ids) for connecting to existing processing.
