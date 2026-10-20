# Phase15 — independent original AIG 3D hair-card exporter

Pre-requisites: Python 3.10+ standard library (Pillow + OpenCV only for OPTIONAL debug renders).

Run using existing Phase13 GLB (genuine skinned reference-projected envelope) and Phase14 hair guides:

```sh
python tools/build_hair_cards.py \
  --base path/to/Phase13/source-envelope-NOT-AUTHORITY.glb \
  --source path/to/approved-reference.png \
  --hair-spec path/to/Phase14/hair-face-spec.v1.json \
  --envelope-spec path/to/Phase13/mesh-envelope.v1.json \
  --phase13-builder path/to/Phase13/tools/build_envelope.py \
  --out phase15-real-3d-hair-cards-NOT-APPROVED.glb \
  --report phase15-build-report.json
```

Then `python -m unittest discover -s tools -p 'test_phase15_hair.py' -v` with environment paths if not using the packaged default locations. The **original PNG is byte-SHA checked**. Camera height and real hair volumes are not inferred from that image. This is a technical candidate that MUST NOT be used on the AIG formal homepage.