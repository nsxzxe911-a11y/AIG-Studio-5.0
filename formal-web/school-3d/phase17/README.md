# Phase17 重新編譯（本機）

先備妥 **正版來源 PNG**（SHA 須匹配）、Phase16 GLB、Phase14 髮絲參數、Phase13 網格參數、兩份 AIG 自己的建構器程式。

```bash
python tools/build_source_fidelity.py \
  --base inputs/phase16-528-fine-strands-NOT-APPROVED.glb \
  --source inputs/approved-source.png \
  --hair-spec inputs/hair-face-spec.v1.json \
  --envelope-spec inputs/mesh-envelope.v1.json \
  --phase15-builder inputs/build_hair_cards.py \
  --phase13-builder inputs/build_envelope.py \
  --out out/phase17-source-guided-NOT-APPROVED.glb \
  --report out/reconstruction-evidence.json
```

驗證（在解壓縮的目錄下設定 AIG_P17_* 環境變數或依預設本機路徑）：

```bash
AIG_P17_HAIR15="$PWD/inputs/build_hair_cards.py" \
AIG_P17_CORE13="$PWD/inputs/build_envelope.py" \
AIG_P17_BASE="$PWD/inputs/phase16-528-fine-strands-NOT-APPROVED.glb" \
AIG_P17_OUT="$PWD/out/phase17-source-guided-NOT-APPROVED.glb" \
AIG_P17_IMAGE="$PWD/inputs/approved-source.png" \
AIG_P17_HAIR_SPEC="$PWD/inputs/hair-face-spec.v1.json" \
AIG_P17_ENV="$PWD/inputs/mesh-envelope.v1.json" \
python -m unittest discover -s tools -p 'test_phase17_source.py' -v
```

本軟體只重建 **可見髮區的 2.5D mesh**，不提供全真 3D 身形、真臉部 AI 或已核准的電影素材。網路沒有使用第三方角色模型。