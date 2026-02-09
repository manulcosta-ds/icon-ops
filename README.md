# Icon Ops - Figma Plugin

Icon library management and auditing plugin for Figma.

## Features

### Import SVG Zip
- Import entire icon libraries from ZIP files
- Automatic style variant detection (outline, filled, rounded, etc.)
- Size variant support (16px, 24px, 32px, etc.)
- Smart Component Set creation for multi-dimensional variants
- Automatic 1200px grid layout
- Built-in audit after import

### Style Variant Detection
The plugin intelligently detects icon style variants from:
1. **Filename suffixes**: `search-outline.svg`, `search-filled.svg`
2. **Folder structure**: `/outline/search.svg`, `/filled/search.svg`
3. **Automatic naming**: Falls back to `style-1`, `style-2` for ambiguous cases

Supported style keywords: outline, filled, solid, regular, light, thin, bold, rounded, sharp, duotone, stroke

### Audit System
Comprehensive icon library auditing with:
- **Duplicate detection**: Exact heuristic comparison
- **Stroke thickness validation**: Flag disallowed weights
- **Fill policy enforcement**: Outline-only mode
- **Geometry cleanup**: Hidden layers, zero opacity, empty groups
- **Naming conventions**: Lowercase, hyphen-separated validation

### Fix System
- Batch fix selected issues
- Preview changes before applying
- Smart fixes:
  - Remove duplicates (keep first)
  - Normalize stroke weights
  - Convert fills to strokes
  - Clean up geometry issues
  - Sanitize names and resolve collisions

### Advanced Features
- **Zoom-to-node**: Click any issue to jump to the affected node
- **Duplicate viewer**: Cycle through duplicate groups with "Next" button
- **Health score**: Overall library quality metric
- **Export reports**: JSON format for external processing
- **Filter issues**: By type (duplicates, strokes, fills, geometry, naming)

1. Open Figma desktop app
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Navigate to the `icon-guardian` folder and select `manifest.json`
4. The plugin will appear in **Plugins** → **Development** → **Icon Guardian**

### Development Mode

For auto-rebuild during development:
```bash
npm run watch
```

This watches for file changes and rebuilds automatically.

## Usage Guide

### Import Icons from ZIP

1. Run the plugin: **Plugins** → **Icon Guardian**
2. Click **Import SVG Zip**
3. Select your ZIP file containing SVG icons
4. Configure options:
   - **Sizes to import**: Enter comma-separated sizes (e.g., `16,24,32`) or leave empty for original size
   - **Allowed stroke weights**: Set validation rules (e.g., `1.5,2`)
   - **Outline-only policy**: Check to flag filled vectors
5. Click **Import Icons**
6. Icons are imported and automatically audited

### Audit Existing Library

1. Run the plugin
2. Click **Audit Existing Library**
3. Select audit scope:
   - **Current Page**: All components on active page
   - **Selected Frame/Nodes**: Only selected items
   - **All Components in File**: Entire document
4. Configure validation rules (stroke weights, outline policy)
5. Click **Run Audit**
6. Review issues by category

### Fix Issues

1. After running an audit, review the issues list
2. Select issues to fix (or use "Select All")
3. Click **Fix Selected**
4. Review the fix preview
5. Click **Apply Fixes** to confirm
6. Changes are applied (use Cmd/Ctrl+Z to undo if needed)

### Navigate Issues

- **Click an issue**: Zooms to the affected node
- **Click a duplicate**: Opens duplicate viewer with cycle controls
- **Filter by type**: Use filter buttons at the top
- **Export report**: Copy JSON report to clipboard

## File Structure

```
icon-guardian/
├── manifest.json          # Figma plugin manifest
├── package.json           # NPM dependencies
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
├── src/
│   ├── main.ts            # Plugin main thread
│   ├── ui.html            # UI interface
│   ├── ui.ts              # UI logic
│   ├── styles.css         # Styles
│   ├── types.ts           # TypeScript types
│   └── utils/
│       ├── svg-parser.ts      # ZIP and SVG parsing
│       ├── variant-utils.ts   # Component Set creation
│       ├── audit-engine.ts    # Audit checks
│       ├── fix-engine.ts      # Fix operations
│       └── layout-utils.ts    # Layout and positioning
└── dist/                  # Built files (generated)
    ├── main.js
    └── ui.html
```

## Technical Details

### Variant Naming Convention

Component Sets use Figma's variant naming:
- Component Set name: `{baseIconName}`
- Variant properties:
  - `Style`: `outline`, `filled`, `rounded`, etc.
  - `Size`: `16`, `24`, `32`, etc.
- Example variant: `Style=outline, Size=24`

### Grid Layout

- Variants arranged in a grid within Component Sets
- 24px horizontal and vertical spacing
- Columns represent sizes (ascending order)
- Rows represent styles
- No overlapping variants

### Audit Heuristics

**Duplicate Detection**:
- Node type comparison
- Dimension matching (rounded to avoid float precision)
- Vector count
- Fill/stroke visibility counts

**Stroke Thickness**:
- Validates against allowed weights list
- Flags mixed weights within a single icon

**Fill Policy**:
- When outline-only enabled, flags vectors with fills but no strokes
- Useful for enforcing consistent icon style

**Geometry Issues**:
- Hidden layers (visible=false)
- Zero opacity layers
- Empty groups
- Tiny nodes (< 1px width or height)

**Naming Issues**:
- Should be lowercase
- Hyphen-separated (no spaces or underscores)
- No special characters
- No name collisions

## Limitations and Notes

### Figma API Constraints

1. **SVG Parsing**: Uses `figma.createNodeFromSvg()` which has limitations:
   - Some complex SVG features may not be fully supported
   - Text in SVGs may not convert perfectly
   - CSS styles in SVGs are not supported

2. **Component Set Layout**: 
   - Manual positioning is used for variant grid layout
   - Figma automatically shows purple outline for Component Sets
   - Minimum 24px spacing is enforced

3. **Batch Processing**:
   - Large ZIP files (1000+ icons) may take time to process
   - Progress indicator updates every 10 icons
   - Consider splitting very large libraries

4. **Undo System**:
   - Fixes can be undone with Figma's native undo (Cmd/Ctrl+Z)
   - Import creates a single undo point
   - Individual fixes are separate undo steps

### Performance Notes

- **Import**: ~50 icons processed per batch with UI updates
- **Audit**: Linear scan of all nodes, O(n) complexity
- **Duplicate detection**: O(n²) worst case, optimized with signature hashing
- **Fix operations**: Atomic per issue, batched by type

### Known Issues

1. **Very complex SVGs**: May import with slight variations from original
2. **Nested zip files**: Not supported (flatten before import)
3. **Non-SVG files in ZIP**: Silently ignored
4. **Unicode in filenames**: Should work but not extensively tested

## Troubleshooting

### Import fails
- Ensure ZIP contains valid SVG files
- Check that SVGs are not corrupted
- Try importing a smaller subset

### Audit shows no results
- Verify scope is correct (page/selection/all-components)
- Check that you have components on the page
- Ensure selection contains icon components

### Fixes not applying
- Some nodes may be locked or in locked frames
- Check console for error messages
- Try fixing issues one type at a time

### Performance issues
- Reduce batch size for imports
- Audit smaller scopes (selection vs all components)
- Close other Figma files

## Future Enhancements

Potential features for future versions:
- Custom style keyword configuration UI
- Batch rename with templates
- Icon comparison view
- Export to various formats
- Team library sync
- Version control integration

## Support

For issues or feature requests, check the implementation notes in the source code or consult Figma's plugin documentation at https://www.figma.com/plugin-docs/

## License

Built as a demonstration plugin for design system operations.
