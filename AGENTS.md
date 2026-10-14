# Architecture rules
- Keep the public landing page concise and link its topics to anchored chapters on the separate public /guide documentation page, so marketing and task instructions do not duplicate each other.
- Frames progression and quality share paginated, user-scoped indexed frames; unmatched files resolve only within their contribution's plan, whose own panel count governs mosaic matching, so simple members remain independent of other members' mosaics.
- Frames groups Team acquisition lines by contribution and pane ID, labels common plans separately, and resolves a member's unassigned single-panel lines to their sole pane for display only, so distinct plans never appear as anonymous duplicate panels.
- Normal project lists use the shared personalProjectFilter and user-scoped query keys; V2 summaries query only those project IDs, so administrative read privileges never widen the personal workspace.

- Use ProjectCoordinates for both project creation and editing, with CoordinateInputs shared by simple targets and mosaic panels, so their layout and epoch handling stay consistent.
- Keep coordinate state and persisted coordinates in J2000; render JNow in the shared inputs and convert imported JNow coordinates once, so changing the displayed epoch does not alter the target.
- The framing viewer inherits the project setup selected in general configuration; do not add an independent setup selector, so the plan and framing cannot diverge.- Team project plan lines and indexed frames carry contribution_id; members write only rows of their own contribution (single-admin owner may edit all), legacy rows with null contribution_id stay common, so contributions never overwrite each other.
- In team projects the edit page keeps the classic layout but scopes setup, folder, framing (project_panes.contribution_id) and acquisition lines to the signed-in member contribution; project name/team/site are owner-only and other members are a read-only reminder, so one framing view overlays everyone.
- Acquisition tracking mode lives on projects.tracking_mode (personal) and project_contributions.tracking_mode (team members): automatic = folder scan only, manual = per-night session_batches that adjust project_acquisitions.acquired, so each member chooses independently.
- The frames quality chart follows the scope, not the viewer: hidden for a personal project in manual mode, and in team visible to every member as soon as one contribution is automatic, so a mixed team keeps one shared curve.

- Render public and authenticated page banners through AppHeader, keeping brand geometry independent of page content and navigation.
- Use CollectionView for collection display modes and the final creation tile, so teams, equipment, sites and projects share responsive ordering and controls.
- Build the project fiche recap with the deterministic projectSummary generator and the shared ProjectSummary card, fed by the page's own plan lines, indexed FWHM and progress value, so no new calculation, table or AI call is introduced and missing data is omitted rather than zeroed.

