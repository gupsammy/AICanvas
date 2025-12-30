# Minimap Feature Spec

## Overview

A fixed-position minimap providing both navigation aid and canvas overview. Users can quickly orient themselves on large canvases, jump to distant locations, and see all layer positions at a glance. The minimap sits in the bottom-right corner with the sidebar relocated to the left side.

## Key Themes

### Navigation & Interaction

The minimap is strictly for navigation—no layer selection or property editing through it. Users interact in two ways:

- **Click to jump:** Clicking anywhere in the minimap centers the main canvas on that location
- **Drag viewport:** The viewport rectangle can be dragged, panning the main canvas in realtime with smooth, continuous updates

The viewport indicator itself should be subtle (thin border) rather than bold, keeping visual focus on the layer rectangles.

### Minimap Zoom

For sparse canvases with widely-spread layers, the minimap supports zooming via mouse wheel. This prevents the "tiny dots on a huge field" problem. Key behaviors:

- Mouse wheel over minimap zooms in/out
- Minimap view auto-follows the current viewport (no manual panning of minimap itself)
- Default zoom level fits all content with padding

### Visual Representation

Layers appear as colored rectangles, coded by type:

| Layer Type | Color |
|------------|-------|
| Image | Blue |
| Video | Purple |
| Audio | Green |
| Sticky note | Yellow |
| Group | Gray (semi-transparent) |
| Drawing | TBD |
| Text | TBD |

Groups render as semi-transparent bounds with their child layers visible inside—both the group rectangle and children appear overlaid.

The currently selected layer gets a visible highlight (outline or glow) to maintain spatial awareness of selection.

Loading layers (mid-generation) appear with a pulsing animation or distinct visual treatment to indicate pending state.

### Styling

Polished floating appearance:
- Semi-transparent dark background
- Rounded corners
- Subtle drop shadow
- Fixed size: 200×150 pixels

Always visible once the feature is enabled—no collapse/toggle mechanism.

### Empty State

When no layers exist, the minimap still displays with just the viewport rectangle on a blank field. No placeholder text or hiding behavior.

## Decisions & Positions

- **Sidebar moves left** to accommodate bottom-right minimap placement
- **Navigation only**—no layer selection through minimap, keeps interaction model simple
- **Colored rectangles over thumbnails**—faster, cleaner, and type colors aid quick identification
- **Realtime viewport dragging**—immediate feedback over jump-on-release
- **Auto-follow zoom**—minimap always centers on current view rather than allowing free pan
- **Always visible**—no toggle/collapse, minimap is a persistent UI element

## Open Questions

- Exact colors for drawing and text layer types (TBD, should fit the palette)
- Keyboard shortcut for "fit all in view" on main canvas (related feature, out of scope here)
- Whether minimap zoom level should persist across sessions or reset

## Constraints & Boundaries

- This is NOT a layer management interface—no selecting, deleting, or editing through minimap
- Fixed dimensions only—not user-resizable
- No thumbnail rendering—rectangles only for performance and clarity
