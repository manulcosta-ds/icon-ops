#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Icon Guardian - Build Verification\n');

const checks = [
  { 
    name: 'Source files exist',
    test: () => fs.existsSync('src/main.ts') && fs.existsSync('src/ui.ts')
  },
  {
    name: 'Utils folder exists',
    test: () => fs.existsSync('src/utils') && fs.readdirSync('src/utils').length === 5
  },
  {
    name: 'Manifest exists',
    test: () => fs.existsSync('manifest.json')
  },
  {
    name: 'Build script exists',
    test: () => fs.existsSync('build.js')
  },
  {
    name: 'node_modules installed',
    test: () => fs.existsSync('node_modules')
  },
  {
    name: 'dist/main.js exists',
    test: () => fs.existsSync('dist/main.js')
  },
  {
    name: 'dist/ui.html exists',
    test: () => fs.existsSync('dist/ui.html')
  },
  {
    name: 'main.js has content',
    test: () => {
      if (!fs.existsSync('dist/main.js')) return false;
      const stats = fs.statSync('dist/main.js');
      return stats.size > 50000; // Should be ~150-200KB
    }
  },
  {
    name: 'ui.html has content',
    test: () => {
      if (!fs.existsSync('dist/ui.html')) return false;
      const stats = fs.statSync('dist/ui.html');
      return stats.size > 10000; // Should be ~50-70KB
    }
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  try {
    const result = check.test();
    if (result) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${check.name} (error: ${e.message})`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed}/${checks.length} checks passed\n`);

if (failed === 0) {
  console.log('🎉 All checks passed! Plugin is ready to use.\n');
  console.log('Next steps:');
  console.log('1. Open Figma Desktop App');
  console.log('2. Plugins → Development → Import plugin from manifest...');
  console.log('3. Select manifest.json from this folder');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please:\n');
  
  if (!fs.existsSync('dist/main.js') || !fs.existsSync('dist/ui.html')) {
    console.log('1. Run: npm run build');
  }
  
  if (!fs.existsSync('node_modules')) {
    console.log('1. Run: npm install');
  }
  
  if (!fs.existsSync('src/main.ts')) {
    console.log('1. Re-download the complete plugin files');
  }
  
  console.log('\nSee BUILD_FIX.md for detailed troubleshooting.');
  process.exit(1);
}
