# AIG FastModel website delivery

Deployment target: existing Render static site `aig-dual-formal-runtime`, `/fastmodel/`.

This website delivery enables **local 2.5D brightness-relief photo animation** and GLB import/playback. It does not deploy the separate neural 3D backend from Draft PR #12. The website explicitly says full 3D reconstruction and automatic rigging are not connected.

Validated locally: six Node tests (bounded/aspect-correct grid, actual exporter/importer animation round trip, pause, TRS/morph channels, external URL rejection), production bundle build and JS syntax. No inferred CPU/FPS or real photo quality acceptance is asserted.

Build sources: `formal-web/school-3d/fastmodel/single-photo/`. The existing Render service publishes committed `formal-web` assets and automatically deploys its website branch. The existing home page receives one navigation link and one additive tool card; other website assets and native apps are untouched.
