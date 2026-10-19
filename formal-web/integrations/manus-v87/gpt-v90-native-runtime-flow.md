# AIG V90 — CAD / CAM / SIM 原生 Runtime 串接

Base: V89 0f1347b74a02056117310deb52414077ab394e33 on isolated branch.
- CAD: read actual \`aigCadApi.getShapeCount()\`, retain native geometry/canvas/AutoSave; add view-only properties collapse on desktop and mobile dock access.
- CAM: read actual runtime paths plus \`aig-cam-toolpath-v1\` saved data; preserve native MANUAL mode, calculation, apply and full original Canvas/API.
- SIM: read actual \`aigSimApi.sample('6AX')\`; only refresh original SIM core, no fabricated removed volume or false Gate.
- Page navigation through original \`data-open-page\` handler and stable dedicated Button IDs. No custom route/NC/Machine controller.
- Screenshots/real-browser actions run at 3840×2160 and 360×772@4x=1440×3088. Numeric CNC and actual device tests remain separate.
- Restore V87 original HTML/service worker by removing *only* the three additive V88/V89/V90 asset references; original base is unchanged.
- Candidate integration only. Formal Render website remains at its existing version. Not merged or deployed.
