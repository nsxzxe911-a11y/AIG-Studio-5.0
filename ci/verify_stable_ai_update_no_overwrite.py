from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
policy=(ROOT/'core/src/main/kotlin/com/aigstudio/core/RollingUpdatePolicy.kt').read_text(encoding='utf-8')

required=(
    'UPDATE_ERROR_RETAINS_STABLE=true',
    'DUAL_PROJECT_PROMOTION_REQUIRES_BOTH=true',
    'PROMOTION_FAIL_CLOSED=true',
    'NO_IN_PLACE_OVERWRITE=true',
    'fun stablePromoteAllowed',
    'candidateVerified',
    'dualProjectPass',
    'exactBindingPass',
    'noUpdateErrors',
    'stable-backup',
    'candidate-',
    'REPLACE_EXISTING',
    'ATOMIC_MOVE',
)
for marker in required:
    assert marker in policy, marker

promote=policy[policy.index('fun promote(staged:File,target:File):File'):]
assert 'if(target.exists()) require(target.delete())' not in promote, 'stable target must not be deleted before verified replacement'
assert 'copyTo(target,overwrite=true)' not in promote, 'candidate may not overwrite stable in place'

print('STUDIO_STABLE_AI_UPDATE_NO_OVERWRITE_PASS|WORKING_COPY|FAIL_CLOSED|DUAL_GATE|EXACT_BINDING|ATOMIC_PROMOTE|STABLE_RETAINED_ON_ERROR')
