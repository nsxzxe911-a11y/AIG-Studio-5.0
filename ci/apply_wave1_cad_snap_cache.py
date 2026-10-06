from pathlib import Path

path = Path('app/src/main/java/com/aigstudio/app/MainActivity.kt')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, code: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'PATCH_ABORT|STUDIO|{code}|COUNT={count}')
    text = text.replace(old, new, 1)

replace_once(
'''    private val renderEngine = CadRenderEngine("AIG-Studio-CAD2D")
    private var sceneRevision = 1L
''',
'''    private val renderEngine = CadRenderEngine("AIG-Studio-CAD2D")
    private val snapCandidateCache = com.aigstudio.app.ui.pages.cad.CadSnapCandidateCache()
    private var geometryRevision = 1L
    private var sceneRevision = 1L
''',
'ADD_GEOMETRY_REVISION_CACHE'
)

replace_once(
'''    private fun snapPoint(p: Vec2): Vec2 {
        val tolerance = 18.0 / transform.pixelsPerUnit
        return CadSnapEngine.snapTo(doc,p,tolerance,reference=firstPoint) ?: p
    }
''',
'''    private fun snapPoint(p: Vec2): Vec2 {
        val tolerance = 18.0 / transform.pixelsPerUnit
        return snapCandidateCache.snap(
            doc=doc,
            p=p,
            tolerance=tolerance,
            revision=geometryRevision,
            reference=firstPoint
        ) ?: p
    }
''',
'ROUTE_SNAP_POINT_TO_CACHE'
)

replace_once(
'''    fun applyPortableProject(project:StudioProjectPackage) {
        StudioProjectRepository.applyTo(project,doc)
        firstPoint=null; arcCenter=null; arcStart=null; selectedIds.clear(); sceneRevision++; invalidate()
    }
''',
'''    fun applyPortableProject(project:StudioProjectPackage) {
        StudioProjectRepository.applyTo(project,doc)
        geometryRevision++
        firstPoint=null; arcCenter=null; arcStart=null; selectedIds.clear(); sceneRevision++; invalidate()
    }
''',
'INVALIDATE_CACHE_ON_PORTABLE_PROJECT'
)

replace_once(
'''        if (restored.isNotEmpty()) {
            doc.clear()
            restored.forEach(doc::put)
            doc.restoreLinks(restoredLinks)
            firstPoint = null
            arcCenter = null
            arcStart = null
            selectedIds.clear()
            sceneRevision++
            invalidate()
        }
''',
'''        if (restored.isNotEmpty()) {
            doc.clear()
            restored.forEach(doc::put)
            doc.restoreLinks(restoredLinks)
            geometryRevision++
            firstPoint = null
            arcCenter = null
            arcStart = null
            selectedIds.clear()
            sceneRevision++
            invalidate()
        }
''',
'INVALIDATE_CACHE_ON_STATE_RESTORE'
)

replace_once(
'''    fun undo() {
        val outcome = history.undoOutcome() ?: return
        firstPoint = null; arcCenter=null; arcStart=null
        applyHistorySelection(outcome.selectionIds)
        sceneRevision++
        onProjectChanged()
        if (outcome.geometryMutation) onGeometryChanged()
        invalidate()
    }
''',
'''    fun undo() {
        val outcome = history.undoOutcome() ?: return
        firstPoint = null; arcCenter=null; arcStart=null
        applyHistorySelection(outcome.selectionIds)
        sceneRevision++
        onProjectChanged()
        if (outcome.geometryMutation) {
            geometryRevision++
            onGeometryChanged()
        }
        invalidate()
    }
''',
'INVALIDATE_CACHE_ON_UNDO'
)

replace_once(
'''    fun redo() {
        val outcome = history.redoOutcome() ?: return
        firstPoint = null; arcCenter=null; arcStart=null
        applyHistorySelection(outcome.selectionIds)
        sceneRevision++
        onProjectChanged()
        if (outcome.geometryMutation) onGeometryChanged()
        invalidate()
    }
''',
'''    fun redo() {
        val outcome = history.redoOutcome() ?: return
        firstPoint = null; arcCenter=null; arcStart=null
        applyHistorySelection(outcome.selectionIds)
        sceneRevision++
        onProjectChanged()
        if (outcome.geometryMutation) {
            geometryRevision++
            onGeometryChanged()
        }
        invalidate()
    }
''',
'INVALIDATE_CACHE_ON_REDO'
)

replace_once(
'''    private fun runGeometryCommand(command: Command) {
        history.run(command)
        sceneRevision++
        onProjectChanged()
        onGeometryChanged()
        invalidate()
    }
''',
'''    private fun runGeometryCommand(command: Command) {
        history.run(command)
        geometryRevision++
        sceneRevision++
        onProjectChanged()
        onGeometryChanged()
        invalidate()
    }
''',
'INVALIDATE_CACHE_ON_GEOMETRY_COMMAND'
)

checks = {
    'CACHE_INSTANCE_MISSING': 'CadSnapCandidateCache()',
    'GEOMETRY_REVISION_MISSING': 'private var geometryRevision = 1L',
    'CACHE_CALL_MISSING': 'snapCandidateCache.snap(',
    'CACHE_REVISION_BINDING_MISSING': 'revision=geometryRevision',
}
for code, token in checks.items():
    if token not in text:
        raise SystemExit(f'PATCH_ABORT|STUDIO|{code}')

snap_start = text.find('private fun snapPoint')
snap_end = text.find('\n    private fun ', snap_start + 1)
if snap_start < 0 or snap_end <= snap_start:
    raise SystemExit('PATCH_ABORT|STUDIO|SNAP_BODY_NOT_FOUND')
if 'CadSnapEngine.snapTo' in text[snap_start:snap_end]:
    raise SystemExit('PATCH_ABORT|STUDIO|DIRECT_SNAP_ENGINE_REMAINS')

path.write_text(text, encoding='utf-8')
print('PATCH_PASS|STUDIO|CAD_GEOMETRY_REVISION_SNAP_CACHE')
