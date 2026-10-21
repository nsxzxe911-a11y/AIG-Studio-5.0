# FastModel 6.9.3 — real mobile reproduction and fixed inputs
A reported Android browser screen displayed AIG65_MODE_DURATION_OR_CLIPS_INVALID and the old '6.7 AUTO BLOCKED'. Browser empty number inputs evaluate as Number('') === 0, and the 6.9.2 handler did not normalize before planAIG65AutoAnimation. Mode can similarly be empty/invalid. **No WAV was necessary** for the video flow.

This patch:
- Restores invalid/empty duration to 8 seconds and invalid/empty mode to AUTO before invoking the original real AUTO planner.
- Restores UI field values visibly and records explicit corrections in the status. Never silently changes an explicit valid 3D mode into fake 2D.
- Provides an actual event-gated, stage-based progress element with state transitions for input validation, bytes / image decode, plan selection, canvas render; no time simulation or fake percentage timer.
- Pins source/image/story/mode/duration/generate in this order on the compact Create panel, moving optional WAV, audio toggles and older technical explanations into a collapsible section after Generate; original IDs and callbacks kept.
- Regression tests in real 360px/1440px Chromium include empty duration+mode, no-WAV photo animation, click->success->video, real screenshot artifacts; guards that the essential form is visually accessible.
- No approved heroine photo, 3D reconstruction or actual device performance Gate is implied.
