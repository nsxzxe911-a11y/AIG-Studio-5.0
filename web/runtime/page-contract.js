export const AIG_PAGE_REGISTRY = Object.freeze([
  {
    id: "HOME",
    pageId: "aig.home",
    panelIds: Object.freeze(["home.project", "home.status", "home.quick"]),
    buttonIds: Object.freeze(["home.new", "home.open", "home.resume"]),
    layoutPriority: 10,
    safetyClass: "normal"
  },
  {
    id: "CAD",
    pageId: "aig.cad",
    panelIds: Object.freeze(["cad.viewport", "cad.tools", "cad.properties"]),
    buttonIds: Object.freeze(["cad.smart.draw", "cad.smart.edit", "cad.smart.snap"]),
    layoutPriority: 100,
    safetyClass: "normal"
  },
  {
    id: "CAM",
    pageId: "aig.cam",
    panelIds: Object.freeze(["cam.viewport", "cam.strategy", "cam.properties"]),
    buttonIds: Object.freeze(["cam.auto", "cam.manual", "cam.toolpath.generate"]),
    layoutPriority: 100,
    safetyClass: "normal"
  },
  {
    id: "TOOLPATH_3D",
    pageId: "aig.toolpath3d",
    panelIds: Object.freeze(["toolpath.viewport", "toolpath.visibility", "toolpath.analysis"]),
    buttonIds: Object.freeze(["toolpath.play", "toolpath.pause", "toolpath.reset"]),
    layoutPriority: 120,
    safetyClass: "normal"
  },
  {
    id: "SIM",
    pageId: "aig.sim",
    panelIds: Object.freeze(["sim.viewport", "sim.playback", "sim.analysis"]),
    buttonIds: Object.freeze(["sim.play", "sim.singleBlock", "sim.stop"]),
    layoutPriority: 130,
    safetyClass: "normal"
  },
  {
    id: "3AX",
    pageId: "aig.axis3",
    panelIds: Object.freeze(["axis3.viewport", "axis3.status", "axis3.control"]),
    buttonIds: Object.freeze(["axis3.jog", "axis3.ncFirst", "axis3.camera"]),
    layoutPriority: 140,
    safetyClass: "machine"
  },
  {
    id: "4AX",
    pageId: "aig.axis4",
    panelIds: Object.freeze(["axis4.viewport", "axis4.status", "axis4.control"]),
    buttonIds: Object.freeze(["axis4.jog", "axis4.ncFirst", "axis4.camera"]),
    layoutPriority: 140,
    safetyClass: "machine"
  },
  {
    id: "5AX",
    pageId: "aig.axis5",
    panelIds: Object.freeze(["axis5.viewport", "axis5.status", "axis5.control"]),
    buttonIds: Object.freeze(["axis5.jog", "axis5.ncFirst", "axis5.camera"]),
    layoutPriority: 140,
    safetyClass: "machine"
  },
  {
    id: "6AX",
    pageId: "aig.axis6",
    panelIds: Object.freeze(["axis6.viewport", "axis6.status", "axis6.control"]),
    buttonIds: Object.freeze(["axis6.jog", "axis6.ncFirst", "axis6.camera"]),
    layoutPriority: 140,
    safetyClass: "machine"
  },
  {
    id: "NC",
    pageId: "aig.nc",
    panelIds: Object.freeze(["nc.editor", "nc.preview", "nc.status"]),
    buttonIds: Object.freeze(["nc.parse", "nc.preview3d", "nc.machineOutput"]),
    layoutPriority: 130,
    safetyClass: "critical"
  },
  {
    id: "AI",
    pageId: "aig.ai",
    panelIds: Object.freeze(["ai.context", "ai.assistant", "ai.result"]),
    buttonIds: Object.freeze(["ai.explain", "ai.suggest", "ai.applyWorkingCopy"]),
    layoutPriority: 60,
    safetyClass: "normal"
  },
  {
    id: "SETTINGS",
    pageId: "aig.settings",
    panelIds: Object.freeze(["settings.system", "settings.display", "settings.sync"]),
    buttonIds: Object.freeze(["settings.display", "settings.renderer", "settings.recovery"]),
    layoutPriority: 40,
    safetyClass: "settings"
  }
]);

export const AIG_FORMAL_PAGE_IDS = Object.freeze(AIG_PAGE_REGISTRY.map(page => page.id));
export const AIG_PAGE_BY_ID = Object.freeze(Object.fromEntries(AIG_PAGE_REGISTRY.map(page => [page.id, page])));
