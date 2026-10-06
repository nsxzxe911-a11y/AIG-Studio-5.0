# CAD Latency + Modular Tool Deck Implementation Plan

**Goal:** Remove multi-second CAD interaction lag while keeping 0.001 mm geometry truth and make the large CAD tool inventory practical on phone/desktop.

**Architecture:** Keep static CAD geometry in the existing RenderNode/Picture cache. Move pointer feedback to a dynamic draft layer; commit geometry only on pointer-up. Introduce a geometry-revision SNAP index so pairwise intersections are built only after geometry changes, never on every move. Keep five quick actions always available and instantiate only the currently selected CAD tool group.

**Constraints:** No engineering shell. No CAM/SIM/NC recomputation during pointer move. No geometry mutation during pointer move. Preserve Undo/Redo and 0.001 mm. Use yesterday morning AIG RGB visual system. Android and Windows remain behavior-compatible.

**Tasks:**
- [ ] Add source/performance gate proving MOVE uses draft only and SNAP intersections are revision-cached.
- [ ] Add core SNAP index/cache with rebuild/query counters for deterministic tests.
- [ ] Port Studio CAD interaction to DOWN -> live MOVE draft -> UP commit.
- [ ] Bind AIG-II draft snapping to the same cached strategy.
- [ ] Add modular CAD tool catalog: Quick = SELECT/PAN/FIT/UNDO/REDO; groups = CAD/VIEW/PHOTO/CORNER/EDIT/FILE.
- [ ] Run focused core + Android compile gates before APK packaging.
