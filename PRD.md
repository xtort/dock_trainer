# Product Requirements Document: Twin Screw Docking Trainer

## 1. Executive Summary

Twin Screw Docking Trainer is a browser-based docking simulator for a Bayliner 4788 Pilothouse Motoryacht — a real 47-foot, 30,000 lb, twin-diesel, twin-thruster motoryacht. It is the twin-engine counterpart to a prior project, Dock Trickster (a single-screw, single-thruster-pair trawler simulator), sharing its design philosophy — real hull dimensions, gameplay-tuned physics coefficients, offline-capable static distribution — while training an entirely different skill set: close-quarters maneuvering with two independently controlled engines.

Where a single-screw boat depends on rudder-and-prop-wash tricks to turn at low speed, a twin-screw boat is maneuvered primarily by opposing the two engines against each other — one ahead, one astern — to walk the boat sideways or pivot it in place, with the rudder largely irrelevant at the dock. The core value proposition is a physically grounded, technique-first curriculum that isolates and drills these twin-engine-specific maneuvers (opposed thrust, pivot turns, prop-walk asymmetry between port-side-to and starboard-side-to landings) rather than simply presenting harder weather on an unchanged control scheme.

The MVP goal is a fully playable, keyboard-controlled, six-level docking curriculum, built as a proper multi-file TypeScript/Vite project, distributable as a static offline-capable bundle, with an automated physics test suite and local progress persistence. A future phase adds game-controller input for more realistic proportional control.

## 2. Mission

Teach real twin-screw docking technique through deliberate, isolated practice — not just harder weather on the same skill.

**Core principles:**
- **Real vessel, real numbers.** Hull length, beam, displacement, and shaft spacing are drawn from the actual Bayliner 4788; only force/drag/added-mass coefficients are gameplay-tuned, and that distinction is documented in-app, not hidden.
- **Technique before difficulty.** Each level isolates one maneuver (straight-in, walking sideways, pivot turn, rudder discipline, combined conditions, side-dependent prop walk) before combining them — the curriculum teaches skills, not just harder instances of the same skill.
- **Controls mirror the real helm.** Two independent engine consoles (shift + throttle per side), proportional spring-back thrusters, and a rudder that is present but deliberately not required — because that's how the real boat is actually docked.
- **No dead weight in the model.** Nothing is modeled that isn't either physically necessary or actively part of the lesson (e.g., the rudder stays only because leaving it off-center is itself a teachable failure mode).
- **Runs anywhere, no strings attached.** No install, no account, no network dependency at play time — a built static bundle that opens and runs offline.

## 3. Target Users

**Primary persona:** A recreational boat owner/operator (the primary example being the actual owner of a Bayliner 4788) who wants to build or refresh close-quarters twin-engine docking skill without burning fuel, risking hull contact, or waiting for good weather. Comfortable with boats and marine terminology (shift/throttle, prop walk, port/starboard, spring lines) but not necessarily a software person — the in-app help and hint text should read like something a docking instructor would say, not a game manual.

**Secondary persona:** Any twin-screw boat operator generally, since the core mechanics (opposed thrust, pivot turns, side-dependent prop walk) generalize beyond the specific 4788 hull, even though this MVP models one specific boat.

**Key needs:**
- Practice a genuinely risky, hard-to-rehearse skill (docking a 30,000 lb boat) with zero real-world consequence for mistakes.
- Understand *why* a maneuver worked or failed (goal checklists, contact counting, dwell timers) rather than just pass/fail.
- Return repeatedly and track improvement over sessions.

**Pain points addressed:**
- Twin-engine docking technique is hard to isolate and drill in real life — every dock approach also involves wind, current, traffic, and irreversible consequences.
- Most boat simulators (including the reference single-screw Dock Trickster) don't model the specific mechanic — opposed independent engines — that defines twin-screw ship-handling.

## 4. MVP Scope

### In Scope

**Core Functionality**
- ✅ Real-time 2D top-down physics simulation of a Bayliner 4788 (rigid-body integration: momentum, water-relative drag, added mass, engine spool lag)
- ✅ Independent port and starboard engine control: 3-position notched shift (Astern/Neutral/Ahead) + continuous 0–100% throttle, per engine
- ✅ Rudder modeled with realistic lift/drag and reduced astern effectiveness, present but not required by any challenge goal; off-center rudder produces drag and unwanted yaw whenever engines/thrusters are used
- ✅ Proportional bow and stern thrusters, spring-back to neutral on release
- ✅ Six-level technique-first curriculum (see Section 7)
- ✅ Wind and current environmental model (adjustable magnitude/direction), affecting hull and superstructure
- ✅ Collision detection (polygon separation) against docks, other boats, and world boundaries; gentle contacts counted, hard impacts end the run
- ✅ Goal evaluation per level: hull inside berth, heading aligned, speed below threshold, controls neutral, sustained (dwell) for a set duration
- ✅ Two-half symmetric dashboard UI: port engine console (left), starboard engine console (right), shared center strip for rudder + bow/stern thrusters
- ✅ Twin visible prop-wash wake trails, offset at estimated shaft spacing, reflecting each engine's actual thrust direction
- ✅ Top-down hull silhouette shaped to the 4788's real length/beam ratio and modified-V hull form
- ✅ HUD: speed, heading, distance to berth, per-engine shift/throttle readouts, rudder angle, thruster levels, dwell/settle timer, elapsed time, contact count
- ✅ Keyboard control scheme (full mapping in Section 7/Tools)
- ✅ Local progress persistence (localStorage): levels cleared, best contact-free run per level
- ✅ Automated physics/state test suite (Vitest), covering independent engine state, opposed-thrust lateral/yaw behavior, off-center rudder penalty, thruster spring-back, collisions, and goal/dwell evaluation
- ✅ Vite production build producing a static, offline-capable bundle

**Technical**
- ✅ TypeScript, multi-file module structure (physics, hull geometry, rendering, input, level definitions, UI wiring kept separate)
- ✅ Canvas2D rendering
- ✅ Input handled behind an abstraction layer decoupling "control state" from "input source," so a future controller input source doesn't require touching physics or UI code

**Deployment**
- ✅ Static `dist/` build, hostable anywhere or opened directly from disk, no server or network dependency at play time

### Out of Scope (deferred)

**Future phases**
- ❌ Game controller / gamepad input (Phase 2 — the input abstraction layer is built now specifically to make this additive later)
- ❌ Touch/mobile control layer (explicitly deferred; v1 is keyboard/desktop-only by design, not an oversight)
- ❌ Additional vessel hulls/models beyond the Bayliner 4788
- ❌ Multiplayer or shared/competitive leaderboards (progress persistence is local-only in MVP)
- ❌ Waves, shallow-water effects, bank suction, or mooring/spring-line physics
- ❌ Server-side accounts, cloud save, or any backend component
- ❌ Localization / non-English text

## 5. User Stories

1. **As a boat owner new to twin-screw handling**, I want to practice walking the boat sideways using opposed engines with no thrusters, so that I build the core muscle memory for a maneuver my single-engine experience never taught me.
   - *Example:* Level 2 places the boat parallel to a tight berth with no wind; the player must put one engine ahead and the other astern to slide laterally into the slip.

2. **As a returning player**, I want my cleared levels and best times saved between sessions, so that I can track improvement over multiple practice sessions without redoing everything from scratch.
   - *Example:* Reopening the app after a week shows Levels 1–3 marked cleared with best contact-free times, and Level 4 unlocked/highlighted as next.

3. **As someone prone to forgetting to center the wheel**, I want the simulation to penalize an off-center rudder with real drag and yaw when I use engines or thrusters, so that I internalize the habit of checking the rudder before/during docking.
   - *Example:* Level 4 starts with the rudder pre-deflected 15° to starboard; using engines symmetrically still pulls the bow off the intended track until the player notices and centers it.

4. **As a player learning prop walk**, I want separate levels for docking port-side-to and starboard-side-to, so that I understand why the same maneuver behaves differently depending on which side of the boat faces the dock.
   - *Example:* Level 6 requires the same opposed-thrust landing technique from Level 2, but on the opposite side, and the resulting drift differs because of asymmetric prop walk.

5. **As a player**, I want a HUD that clearly shows both engines' independent shift/throttle state at a glance, so that I can verify I have the correct opposed configuration (e.g., port ahead / starboard astern) without guessing.
   - *Example:* The two-half dashboard visibly mismatches (green highlight on "Ahead" for port, red on "Astern" for starboard) when thrust is opposed.

6. **As a player using only a keyboard**, I want dedicated, ergonomically grouped keys for each of the seven independent controls (2 shifters, 2 throttles, rudder, 2 thrusters), so that I can operate multiple controls simultaneously without hand strain or key conflicts.
   - *Example:* A/Z (port shift) and S/X (starboard shift) sit together on the left hand; J/N/K/M (throttles) sit together on the right hand; arrows (rudder) are physically separated to reinforce that it's not a primary control.

7. **As a developer/maintainer**, I want the physics/state logic fully covered by a DOM-free unit test suite, so that a sign error in torque or force computation (e.g., a flipped yaw direction on opposed thrust) is caught automatically rather than only by eyeballing gameplay.
   - *Example:* A test asserts that equal-and-opposite port/starboard thrust produces near-zero net yaw rate change and non-zero lateral velocity, within tolerance.

8. **As a player who's completed the keyboard curriculum**, I want to eventually practice with a real game controller for more realistic proportional throttle/thruster feel, so that my practice transfers more directly to real console feel.
   - *Example (Phase 2, not MVP):* Analog trigger axes map continuously to each engine's throttle instead of discrete key-hold ramping.

## 6. Core Architecture & Patterns

**High-level approach:** A client-only, single-page TypeScript application built with Vite, rendering a 2D top-down scene via Canvas2D. All physics/state logic lives in DOM-free, pure(ish) modules so it is directly unit-testable; rendering and DOM/UI wiring are thin layers that read from the same state object.

**Directory structure (proposed):**
```
dock_trainer/
├── PRD.md
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.ts              # bootstraps state, input, render loop
│   ├── physics/
│   │   ├── hull.ts          # 4788 hull geometry, mass/inertia, shaft spacing
│   │   ├── integrate.ts     # force/torque model, Newtonian integration
│   │   ├── collisions.ts    # polygon separation, contact resolution
│   │   └── goals.ts         # per-level goal/dwell evaluation
│   ├── levels/
│   │   └── levels.ts        # 6-level curriculum definitions
│   ├── input/
│   │   ├── inputSource.ts   # abstraction: keyboard now, gamepad later
│   │   └── keyboard.ts      # v1 keyboard binding implementation
│   ├── render/
│   │   ├── scene.ts         # canvas draw loop: hull, wakes, docks, HUD overlays
│   │   └── hudDom.ts        # DOM-based dashboard (two-half console layout)
│   ├── state/
│   │   ├── state.ts         # createState, mode transitions
│   │   └── persistence.ts   # localStorage read/write for progress
│   └── style.css
├── tests/
│   └── physics.test.ts      # Vitest suite, no DOM mocking required
└── dist/                    # Vite build output (static, offline-capable)
```

**Key design patterns:**
- **Pure physics core:** `physics/*` modules take plain data in and return plain data out — no DOM, no canvas, no event listeners — so they're directly testable and reusable if rendering ever changes.
- **Input abstraction:** an `InputSource` interface exposes a normalized control-state snapshot (`{ portShift, portThrottle, stbdShift, stbdThrottle, rudder, bow, stern }`); `keyboard.ts` implements it for v1, a future `gamepad.ts` implements the same interface for v2, and neither physics nor rendering code needs to know which is active.
- **Fixed-timestep integration decoupled from render rate:** an accumulator pattern (as used in the reference single-screw project) ensures physics behaves identically regardless of display refresh rate.
- **Symmetric two-half UI composition:** the dashboard is built from one `EngineConsole` component instantiated twice (mirrored for port/starboard) plus a shared center strip, rather than bespoke markup per side, so the port/starboard visual symmetry is structurally guaranteed, not hand-maintained.

## 7. Tools/Features

### Feature: Twin independent engine control
- **Purpose:** Model and expose two fully independent propulsion units, since opposing them against each other is the core trained skill.
- **Behavior:** Each engine has a 3-position notched shift (Astern/Neutral/Ahead, stepped one notch per keypress, no dedicated neutral key) and a separate continuous throttle (0–100%, held-key ramping).
- **Keys:** Port shift A(up)/Z(down); starboard shift S(up)/X(down); port throttle J(up)/N(down); starboard throttle K(up)/M(down).

### Feature: Rudder (present, not required)
- **Purpose:** Teach the specific real-world failure mode of an off-center rudder dragging and adding unwanted yaw during engine/thruster use, without making rudder use part of any level's success criteria.
- **Behavior:** Realistic lift/drag model with reduced effectiveness astern (adapted from the reference project's actuator-disk/prop-wash approximation, generalized per engine or omitted where not applicable to a rudder-independent-of-prop-wash model — to be finalized during implementation). Off-center deflection imposes a persistent drag penalty and yaw bias.
- **Keys:** Left/Right arrows adjust; Down arrow snaps to center instantly.

### Feature: Proportional bow/stern thrusters
- **Purpose:** Match the real vessel's spring-centered thruster controls; provide fine lateral/yaw correction, especially for combined-conditions levels.
- **Behavior:** Proportional, held-key ramps toward full deflection, springs back to neutral immediately on release (never holds state after release, unlike shift).
- **Keys:** Bow Q(port)/E(starboard); stern D(port)/G(starboard).

### Feature: Six-level technique curriculum
1. **Straight-in approach** — calm water, symmetric thrust only; establish baseline feel for two independent throttles/shifters.
2. **Walking sideways** — opposed thrust (one engine ahead, one astern) to slide laterally into a tight parallel berth; thrusters disallowed or unnecessary by design.
3. **Pivot turn** — spin the boat in place in a tight fairway using opposed thrust, then complete the approach.
4. **Off-center rudder distraction** — rudder starts (or becomes) deflected; player must notice and correct while completing an otherwise straightforward approach.
5. **Wind/current + thrusters** — full environmental combination, thrusters used for final fine positioning.
6. **Port-side-to vs. starboard-side-to** — same maneuver as an earlier level, opposite side, demonstrating asymmetric prop-walk/wash effects.

Each level defines: start position/heading, goal berth (position/size/required heading), wind speed+direction, current speed+direction, and level-specific hint text.

### Feature: Goal & dwell evaluation
- **Purpose:** Objectively define "successfully docked" the same way the reference project does, extended for twin-engine neutral state.
- **Behavior:** Per-frame evaluation of: hull fully inside berth polygon; heading within tolerance of required heading; speed below threshold; both shifters neutral and both engines' effective thrust near zero and both thrusters at zero. All four sustained simultaneously for a fixed dwell duration (e.g., 3 seconds) triggers a win.

### Feature: Collision detection
- **Purpose:** Penalize contact with docks, other boats, and world boundaries realistically.
- **Behavior:** Separating-axis polygon collision (reused approach from the reference project) against all obstacles; gentle contacts increment a contact counter (rate-limited per obstacle to avoid double-counting a sustained touch); impacts above a closing-speed threshold end the run as a hard "crashed" state.

### Feature: Two-half dashboard UI
- **Purpose:** Present the doubled instrumentation (vs. a single-engine reference) without visual clutter, while reinforcing the port/starboard mental model.
- **Behavior:** Port engine console (shift state, throttle level) on the left; starboard mirrored on the right; shared center strip for rudder indicator and both thruster controls; HUD strip above showing speed, heading, distance-to-berth, elapsed time, contact count, and goal checklist with dwell meter.

### Feature: Progress persistence
- **Purpose:** Support a trainer used repeatedly over time, unlike a one-off toy.
- **Behavior:** On level completion, write cleared-status and best (fastest contact-free, or contact-minimizing) run to localStorage, keyed by level id; on load, restore and reflect in level-select UI.

## 8. Technology Stack

**Core**
- TypeScript (latest stable) — strict mode enabled
- Vite — dev server + static production build, no server-side component
- Canvas2D (native browser API) — no rendering library/engine dependency, consistent with the reference project's zero-dependency philosophy

**Testing**
- Vitest — integrates natively with Vite config/tooling, tests run directly against `physics/*` modules with no DOM mocking required

**Dependencies**
- No runtime third-party libraries required for MVP (physics, rendering, and UI are all hand-rolled, consistent with the reference project's "no libraries, no assets, no network requests" constraint)
- Dev dependencies only: `typescript`, `vite`, `vitest`

**Optional (Phase 2+)**
- Gamepad API (native browser `navigator.getGamepads()`) — no library needed for v2 controller support given the input abstraction already in place

**Third-party integrations:** None. No analytics, no backend, no external asset/CDN dependencies — the built `dist/` output must remain fully self-contained and offline-capable.

## 9. Security & Configuration

**Authentication/authorization:** None required or applicable — fully client-side, single-user, no accounts.

**Configuration management:** No environment variables or secrets required for MVP; any tunable values (level definitions, physics coefficients) live in versioned TypeScript source, not runtime config.

**Security scope:**
- **In scope:** Standard safe client-side practices — no `eval`/unsafe DOM injection, no third-party script loading, localStorage usage limited to plain JSON progress data (no PII).
- **Out of scope:** Authentication, authorization, network security, data-in-transit protections — inapplicable to a fully offline, client-only static app with no network calls.

**Deployment considerations:** Ships as a static `dist/` bundle; can be hosted on any static host (GitHub Pages, Netlify, S3, etc.) or opened directly from disk via `dist/index.html`, matching the reference project's zero-install distribution model.

## 10. API Specification

Not applicable — this is a fully client-side static application with no backend, network calls, or external API surface.

## 11. Success Criteria

**MVP success is defined as:** a player can open the built app (locally or hosted), play through all six levels using only the keyboard, and experience physically distinguishable outcomes for correct vs. incorrect twin-engine technique (e.g., opposed thrust actually walks the boat sideways; an off-center rudder actually drags the approach off-track), with progress saved between sessions.

**Functional requirements:**
- ✅ All seven independent controls (2 shift, 2 throttle, rudder, 2 thrusters) function per the key mapping in Section 7, with correct spring-back/notch/continuous behavior as specified per control
- ✅ Physics model uses real 4788 length/beam/displacement/shaft-spacing as its physical basis
- ✅ All six levels are completable and each isolates its intended technique (verified by playtesting, not just goal-polygon logic)
- ✅ Collision detection distinguishes gentle contact (counted) from hard impact (run-ending)
- ✅ Dwell-based win condition matches specification (inside berth + heading + speed + fully neutral controls, sustained)
- ✅ Progress persists across browser sessions via localStorage
- ✅ Vitest suite passes and covers the twin-engine-specific behaviors called out in Section 4
- ✅ Production build runs correctly when opened directly from disk (no dev server, no network)

**Quality indicators:**
- No console errors during normal play
- Physics remains stable (no NaN/divergence) across all six levels under default and edge-case (max wind/current) settings
- Frame rate holds steady (no perceptible stutter) on typical hardware

**User experience goals:**
- A player with real twin-screw docking knowledge should recognize the modeled behaviors (opposed-thrust walking, pivot turns, asymmetric prop walk, off-center rudder drag) as qualitatively correct, even though coefficients are gameplay-tuned rather than CFD-calibrated
- The two-half dashboard should make it possible to verify current engine configuration (e.g., "am I opposed correctly?") at a glance, without reading numeric values

## 12. Implementation Phases

### Phase 1 — Project scaffolding & physics core
**Goal:** Stand up the project and get a physically plausible twin-engine hull responding to input, independent of rendering/UI polish.
- ✅ Vite + TypeScript project scaffolded per Section 6's directory structure
- ✅ Hull geometry, mass/inertia, and shaft spacing derived from real 4788 specs
- ✅ Core force/torque model: twin independent engine thrust, rudder lift/drag, thruster forces, wind/current, drag/added-mass
- ✅ Fixed-timestep integration loop (accumulator pattern)
- ✅ Vitest suite covering force/torque correctness (opposed-thrust yaw/lateral behavior, off-center rudder penalty, thruster spring-back)
- **Validation:** Headless test suite passes; a minimal debug harness (even console-logged state) demonstrates opposed thrust producing lateral velocity with near-zero yaw, and single-side thrust producing yaw with limited translation.

### Phase 2 — Rendering, input, and dashboard
**Goal:** Make the simulation playable end-to-end via keyboard, with the full two-half dashboard.
- ✅ Canvas2D rendering: 4788-proportioned hull silhouette, twin wake trails, docks/obstacles/boundaries, marina scene
- ✅ Keyboard `InputSource` implementation per the full key mapping
- ✅ Two-half symmetric dashboard UI (port/starboard engine consoles, shared rudder/thruster strip, HUD readouts)
- ✅ Collision detection and goal/dwell evaluation wired into the render loop
- **Validation:** A single level (Level 1, straight-in) is fully playable start-to-finish with correct win/crash detection and live HUD feedback.

### Phase 3 — Full curriculum & persistence
**Goal:** Complete the six-level curriculum and add cross-session progress tracking.
- ✅ All six levels defined and tuned (start/goal/environmental parameters per Section 7)
- ✅ Level-select UI reflecting cleared/uncleared state
- ✅ localStorage persistence for cleared levels and best runs
- ✅ In-app help/hint content per level (docking-instructor tone, per Section 3)
- **Validation:** A full playtest pass confirms each level isolates its intended technique and that difficulty/hint text reads clearly to a boater audience; progress correctly persists across a browser reload.

### Phase 4 — Build, polish, and offline distribution
**Goal:** Ship a production-quality static bundle matching the reference project's distribution model.
- ✅ Production Vite build verified to run fully offline from `dist/index.html`
- ✅ Cross-check physics/UI against the reference project's polish bar (accessibility basics, responsive layout where reasonable for a desktop-first app, pause/restart controls)
- ✅ README documenting controls, curriculum, and modeling caveats (real dimensions, gameplay-tuned coefficients — stated explicitly, not implied as calibrated)
- **Validation:** A clean checkout, `npm install && npm run build`, and opening `dist/index.html` directly (no dev server) reproduces full gameplay with no errors.

*(Phase 5, post-MVP: gamepad input via the existing `InputSource` abstraction — see Future Considerations.)*

## 13. Future Considerations

- **Gamepad/controller support (Phase 2 of the product, not this build's Phase 2):** implement `InputSource` for the Gamepad API, mapping analog axes/triggers to continuous throttle and thruster control for more realistic proportional feel than keyboard hold-to-ramp.
- **Touch/mobile support:** if demand emerges, adapt the two-half dashboard into touch-draggable sliders (as the reference single-screw project already does), but only after the keyboard/controller experience is solid.
- **Additional vessels:** the architecture (real hull specs + gameplay-tuned coefficients, data-driven level definitions) generalizes to other twin-screw or even triple/single-screw hulls if the trainer concept expands beyond the 4788.
- **Environmental depth:** shallow-water effects, bank suction, or basic mooring/spring-line mechanics, if the six-level curriculum proves insufficient for the intended skill transfer.
- **Shared/competitive elements:** leaderboards or shared best-times, only if the local-only persistence model proves limiting — would require introducing a backend, a nontrivial scope jump from the current zero-backend architecture.

## 14. Risks & Mitigations

1. **Risk:** Estimated shaft spacing (not a published spec) is wrong enough that opposed-thrust maneuvers feel either too easy or too sluggish, undermining the core training value.
   **Mitigation:** Treat shaft spacing as an explicitly tunable, documented-as-estimated coefficient (consistent with the project's "real dimensions, gameplay-tuned forces" philosophy); validate via playtesting against known real-world twin-screw handling feel and adjust rather than treating the initial estimate as fixed.

2. **Risk:** Doubling the control surface (7 independent controls vs. dock-trickster's ~5) makes v1 keyboard play overwhelming or error-prone, especially under simultaneous multi-control demands (e.g., opposed shift + thruster correction at once).
   **Mitigation:** The key mapping was deliberately designed around ergonomic hand-grouping (left hand = shift, right hand = throttle, arrows physically separated for the intentionally-secondary rudder); validate this holds up in actual play during Phase 2, not just on paper.

3. **Risk:** A sign or reference-frame error in the twin-engine torque/force model (e.g., flipped yaw direction under opposed thrust) could be visually subtle but would completely undermine the training value, since the whole point is teaching correct real-world intuition.
   **Mitigation:** Vitest coverage explicitly targets this class of bug (opposed-thrust yaw/lateral assertions) before any rendering/UI work begins in Phase 1, so the physics core is validated in isolation first.

4. **Risk:** Level curriculum ends up only varying weather/difficulty rather than truly isolating distinct techniques (the failure mode this project explicitly set out to avoid, seen in the single-screw reference's 3 levels).
   **Mitigation:** Each of the six levels has an explicit, named technique it's designed to isolate (Section 7); Phase 3 validation is playtesting specifically for "does this level require the intended technique to complete," not just "is the goal polygon reachable."

5. **Risk:** Real-vessel-specs research (LOA/beam/displacement/engine power) is accurate, but shaft spacing and force coefficients are inherently estimated — a player who is the actual 4788 owner may notice discrepancies from their real boat's handling.
   **Mitigation:** Document explicitly in-app (matching the reference project's own help-dialog disclosure pattern) that dimensions/mass are real but coefficients are gameplay-tuned, not CFD/sea-trial calibrated — setting correct expectations rather than implying simulator-grade fidelity.

## 15. Appendix

**Related documents / prior art:**
- Reference project: Dock Trickster (`../dock-trickster`) — single-file HTML/CSS/JS docking simulator for a 40-foot single-screw trawler; source of the core physics/collision/goal-evaluation approach adapted here for twin-engine mechanics, and the distribution philosophy (offline-capable static bundle, no libraries/assets/network calls).

**Key vessel data sources:**
- [Bayliner 4788 Pilothouse (1994–2002) — Specs, Photos & Review | HMY Yachts](https://www.hmy.com/yachting/powerboat-guide/bayliner/4788-pilothouse-1994-2002)
- [1995 Bayliner 4788 Pilot House Motoryacht "HARMONY" - Florida Yachts International](https://fyiyachts.com/yacht-listing/1995-bayliner-4788-pilot-house-motoryacht/)
- [2000 Bayliner 4788 Pilot House Motoryacht Specs And Pricing](https://www.boatsdata.com/2000-bayliner-4788-pilot-house-motoryacht-53024/specs)

**Confirmed vessel specs (MVP physical basis):**
- LOA: 47' (50' with bow pulpit), Beam: 15'1", Draft: 3'4", Displacement: 30,000 lbs
- Hull: fiberglass modified-V, 6° deadrise aft (semi-displacement, not full-planing)
- Propulsion: twin diesel inboards, commonly 300–375hp each across real-world examples
- Shaft spacing: not a published spec; to be estimated as a fraction of beam and documented as such

**Project structure:** see Section 6 for the proposed `src/` layout.
