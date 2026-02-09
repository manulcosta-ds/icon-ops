# Icon Guardian - Quick Start

Get Icon Guardian running in Figma in 5 minutes.

## Step 1: Install Dependencies

Open terminal in the `icon-guardian` folder and run:

```bash
npm install
```

## Step 2: Build

```bash
npm run build
```

You should see:
- ✅ main.js built successfully
- ✅ ui.html built successfully

Check that `dist/` folder was created with `main.js` and `ui.html`.

> **Note**: If you get build errors, see [BUILD_FIX.md](BUILD_FIX.md) for troubleshooting.

## Step 3: Load in Figma

1. Open **Figma Desktop App** (not web browser)
2. Click **Plugins** → **Development** → **Import plugin from manifest...**
3. Navigate to the `icon-guardian` folder
4. Select `manifest.json`
5. Click **Open**

## Step 4: Run the Plugin

1. In Figma, click **Plugins** → **Development** → **Icon Guardian**
2. The plugin UI will appear

## Quick Test

### Test Import:
1. Click **Import SVG Zip**
2. Select a ZIP file with SVG icons
3. Leave sizes empty (preserves original size)
4. Click **Import Icons**
5. Watch as icons are imported and audited automatically

### Test Audit:
1. Click **Audit Existing Library**
2. Select scope: **Current Page**
3. Click **Run Audit**
4. Review any issues found

## Common Issues

**"npm: command not found"**
- Install Node.js from https://nodejs.org

**"Cannot find module"**
- Run `npm install` again

**Plugin doesn't appear in Figma**
- Make sure you're using Figma Desktop App (not browser)
- Check that `dist/` folder was created
- Try restarting Figma

**Import button doesn't work**
- Make sure you selected a .zip file
- Check that the ZIP contains .svg files

## Development Mode

For live reloading during development:

```bash
npm run watch
```

Then in Figma:
1. Right-click the plugin → **Run from manifest.json**
2. Make code changes
3. Rerun the plugin to see updates

## Next Steps

See [README.md](README.md) for:
- Full feature documentation
- Usage guide
- Technical details
- Troubleshooting

## Pro Tips

1. **Organize your ZIP**: Use folder names like `outline/`, `filled/` for automatic style detection
2. **Name files consistently**: Use hyphens, e.g., `search-icon.svg`
3. **Start small**: Test with 10-20 icons before importing huge libraries
4. **Use size variants**: Enter `16,24,32` to create Component Sets with size variants
5. **Check audit results**: Always review the automatic audit after import

Happy icon management! 🎨
