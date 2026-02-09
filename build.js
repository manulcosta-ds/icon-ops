const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

// Create dist folder if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build main.ts
esbuild.build({
  entryPoints: [path.join(rootDir, 'src/main.ts')],
  bundle: true,
  outfile: path.join(rootDir, 'dist/main.js'),
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  external: [],
  logLevel: 'info'
}).then(() => {
  console.log('✅ main.js built successfully');
}).catch(() => process.exit(1));

// Build UI - inline everything
async function buildUI() {
  // Build ui.ts
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/ui.ts')],
    bundle: true,
    outfile: path.join(rootDir, 'dist/ui-temp.js'),
    platform: 'browser',
    target: 'es2020',
    format: 'iife',
    logLevel: 'info'
  });

  // Read files
  const html = fs.readFileSync(path.join(rootDir, 'src/ui.html'), 'utf8');
  const css = fs.readFileSync(path.join(rootDir, 'src/styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(rootDir, 'dist/ui-temp.js'), 'utf8');

  // Inline everything
  const finalHtml = html
    .replace('<link rel="stylesheet" href="./styles.css">', `<style>${css}</style>`)
    .replace('<script type="module" src="./ui.ts"></script>', `<script>${js}</script>`);

  // Write final HTML
  fs.writeFileSync(path.join(rootDir, 'dist/ui.html'), finalHtml);
  
  // Clean up temp file
  fs.unlinkSync(path.join(rootDir, 'dist/ui-temp.js'));
  
  console.log('✅ ui.html built successfully');
}

buildUI().catch(() => process.exit(1));
