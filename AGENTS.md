# Architecture rules

- Use ProjectCoordinates for both project creation and editing, with CoordinateInputs shared by simple targets and mosaic panels, so their layout and epoch handling stay consistent.
- Keep coordinate state and persisted coordinates in J2000; render JNow in the shared inputs and convert imported JNow coordinates once, so changing the displayed epoch does not alter the target.
- The framing viewer inherits the project setup selected in general configuration; do not add an independent setup selector, so the plan and framing cannot diverge.