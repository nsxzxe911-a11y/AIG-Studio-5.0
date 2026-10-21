# AIG FastModel 6.7 — one-image native face rectangle and real WAV-amplitude animation (Draft)

Starting from FastModel **6.6.0** / commit `dc435778b0d120c554ca6e93b716149026b628cd`, preserving GitHub PR #12 as an unmerged Draft.

- Optional browser-native `FaceDetector` (when installed on the device) returns a single verified *face bounding rectangle*; otherwise local silhouette geometry from 6.6 remains explicitly an estimate, NOT detected facial landmarks. Multiple people and invalid rectangles are refused.
- Independent, local `RIFF/WAVE PCM16` mono or stereo decode, 8–96kHz, up to 60 seconds, with real PCM sample-based 25ms RMS envelope. No API/cloud inference, no phony phoneme detection, no synthetic dialogue claims.
- Use the identical loaded audio PCM to drive lip opening in Canvas 2D/2.5D preview and 1920×1080 MediaRecorder frames. PCM voice playback connects to StoryAudio WebAudio recording destination so the same user WAV is audible in the resulting recording **when browser capture succeeds**.
- The default sound effects/music options continue unchanged; system speechSynthesis remains explicitly NOT captured into video.
- 2D/2.5D/3D AUTO, original photograph, existing GLB motion, story, costumes and audio modules preserved; recording is only available on real Canvas 2D/2.5D.
- WAV amplitude is only *amplitude-synchronized mouth motion*, not verified phoneme/lip-sync, identity-specific face rigging, or human likeness. Native detector may be unsupported. No recorded user video, measured device FPS or formal Render deployment is implied.
- Test with `node --test tests/aig-portrait-audio-6-7.test.mjs` and all existing source Gates; only latest-head GitHub Actions success establishes SOURCE PASS.
- **Release Gate stays BLOCKED** until a real character PNG, actual exported 1080p encoded file, audio-track playback, Android/Windows frame/thermal QA, and human inspection are completed.
