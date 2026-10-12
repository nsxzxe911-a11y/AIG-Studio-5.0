from pathlib import Path

R = Path(__file__).resolve().parents[1]

def need(path, *tokens):
    file = R / path
    if not file.is_file():
        raise SystemExit('MISSING:' + str(path))
    text = file.read_text(encoding='utf-8')
    for token in tokens:
        if token not in text:
            raise SystemExit('MISSING_TOKEN:' + str(path) + ':' + token)
    return text

need(Path('settings.gradle.kts'), 'AIG-Fifth-435')
need(Path('app/build.gradle.kts'), '4350001', '435.0.0')
main = need(
    Path('app/src/main/kotlin/com/aig/fifth432/MainActivity.kt'),
    'HorizontalScrollView',
    'MachineGlView',
    'MachineMode.SIM',
    'MachineMode.AXIS6',
    'listOf(\'A\', \'B\', \'C\')',
    'resetSimulation',
    'removedVolumeMm3'
)
home = need(
    Path('feature-home/src/main/kotlin/com/aig/feature/home/HomeFeatureView.kt'),
    'AIG-II / AIG CNC',
    '0.001 mm',
    '製圖 → 刀路 → 模擬 → NC'
)
renderer = need(
    Path('renderer-unity-api/src/main/kotlin/com/aig/renderer/unity/api/MachineGlView.kt'),
    'GLSurfaceView.Renderer',
    'GLES20.glDrawArrays',
    'Matrix.rotateM',
    'drawStock',
    'cutSegment',
    'removedVolumeMm3'
)
need(
    Path('renderer-unity-api/src/main/kotlin/com/aig/renderer/unity/api/StockRemovalGrid.kt'),
    'cutSegment',
    'removedVolumeMm3'
)

for asset in ['aig_cad.png', 'aig_cam.jpg', 'aig_sim.jpg', 'aig_axis3.jpg', 'aig_axis4.png', 'aig_axis5.jpg', 'aig_machine.jpg']:
    path = R / 'core-ui/src/main/res/drawable-nodpi' / asset
    if not path.is_file() or not path.stat().st_size:
        raise SystemExit('MISSING_RGB:' + asset)

for bad in [
    'Android 官方 Runtime',
    'One Scene',
    'One Renderer',
    'No Overlay',
    '工程殼',
    'renderer 尚未掛載',
    'engineering shell',
    'fake 3d'
]:
    if bad.lower() in (main + '\n' + home + '\n' + renderer).lower():
        raise SystemExit('FORBIDDEN:' + bad)

print('AIG_ANDROID_OFFICIAL_435_STATIC_PASS')
