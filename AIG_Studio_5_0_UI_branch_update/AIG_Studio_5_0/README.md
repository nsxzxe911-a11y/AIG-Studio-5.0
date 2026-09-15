# AIG Studio 5.0 — clean-core rebuild

This is a from-scratch Android project foundation for the locked 5.0 direction.

## Implemented in this first code drop
- App name: **AIG Studio 5.0**
- Adaptive wrapping mobile tool bar (no AndroidX dependency)
- Real CAD entities: line / circle / arc
- One world-coordinate transform used by drawing and touch
- Functional visible tools only: Line, Rectangle, Circle, Delete, C chamfer, R fillet, Undo, Redo, Pan
- Pinch zoom that preserves the world point under the fingers
- Command-based Undo/Redo
- Delete means delete only: no automatic reconnect/closure
- C chamfer: select two lines, trims both, inserts real chamfer line
- R fillet: select two lines, trims both, inserts mathematically tangent arc
- Read-only CAD snapshot boundary for CAM foundation
- Pure Kotlin regression suite covering the historical failure modes

## Regression rules already encoded
1. Deleting one side from a 4-side rectangle leaves exactly 3 open line entities.
2. Undo/Redo restores deterministic geometry.
3. C5 on a 90-degree corner trims to (5,0)/(0,5) and inserts the bridge.
4. R5 on a 90-degree corner creates a center at (5,5) and true 5 mm radius.
5. Screen/world coordinate conversion round-trips and zoom preserves the focused world point.
6. CAM receives a geometry snapshot; later CAD edits do not mutate it.

## Build note
The current execution container has Java/Kotlin but no Android SDK / Gradle installation, so the Android APK cannot be compiled here yet. The geometry core is compiled and executed directly with `kotlinc` as a real test in this environment.

## 5.0 AI safety update
- Added local AI-style CAD preflight inspection without changing the 5.0 version number.
- Detects zero/tiny geometry, duplicate geometry, and near-connected line endpoints.
- Inspection is read-only: it never silently edits CAD geometry or emits machining code.
- CAM/G-code safety remains confirmation-first; tool/Z/offset checks must be validated before machining.
