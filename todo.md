[x] Whole Board needs to be visible on landscape mode on mobile
[x] While game is in progress Actions div (with create match and join input field) should be hidden
[x] There should be an option for light and dark theme

## Implementation Notes

### Mobile Landscape Mode ✅
- Added dedicated media query for landscape orientation (max-width: 900px and orientation: landscape)
- Reduced padding and spacing to maximize board visibility
- Optimized font sizes and button dimensions for landscape mode
- Ensured whole board is visible without scrolling on mobile landscape

### Hide Actions During Gameplay ✅
- Added `updateActionsVisibility()` function that toggles actions div display
- Actions are now hidden when game status is 'active' or 'waiting'
- Actions reappear when game is 'idle', 'finished', or 'abandoned'
- Integrated into existing `refreshUI()` function for seamless state management

### Light/Dark Theme Toggle ✅
- Added comprehensive CSS variables for both light and dark themes
- Implemented theme toggle button in hero section with moon/sun icons
- Added localStorage persistence for user theme preference
- Automatically detects system color scheme preference on first load
- Smooth transitions and hover effects for theme toggle button
- Light theme uses blue/purple color scheme vs dark theme's purple/blue

## Files Modified
- `public/styles.css`: Added mobile landscape media queries, light theme CSS variables, theme toggle styles
- `public/index.html`: Added theme toggle button and restructured hero controls
- `public/app.js`: Added theme management functions and actions visibility control