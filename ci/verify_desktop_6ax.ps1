$ErrorActionPreference='Stop'
$f=Join-Path $PSScriptRoot '..\desktop\src\main\kotlin\com\aigstudio\desktop\DesktopApp.kt'
$s=Get-Content $f -Raw -Encoding UTF8
$required=@(
  'setOf("3D","3AX","4AX","5AX","6AX")',
  'mode("6AX"',
  "SixAxisRuntimeContract.step(SixAxisRuntimeContract.state(axisA,axisB,axisC),'C',-15.0)",
  'action("C+"',
  'axisC',
  '6AX_C_AXIS_NC_POST_BLOCKED'
)
$missing=$required | Where-Object { -not $s.Contains($_) }
if($missing){ throw "DESKTOP_6AX_WIRING_FAIL missing: $($missing -join ', ')" }
Write-Host 'DESKTOP_6AX_WIRING_PASS'
