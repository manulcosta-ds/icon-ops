#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo estrutura de arquivos...\n');

const moves = [
  // Se os arquivos estão em uma pasta 'ui/', mover para 'src/'
  { from: 'ui/ui.ts', to: 'src/ui.ts' },
  { from: 'ui/ui.css', to: 'src/styles.css' },
  { from: 'ui/index.html', to: 'src/ui.html' },
  
  // Caso tenham sido baixados na raiz
  { from: 'ui.ts', to: 'src/ui.ts' },
  { from: 'styles.css', to: 'src/styles.css' },
  { from: 'ui.html', to: 'src/ui.html' },
  { from: 'main.ts', to: 'src/main.ts' },
  { from: 'types.ts', to: 'src/types.ts' },
];

// Criar pastas necessárias
['src', 'src/utils'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Criada pasta: ${dir}`);
  }
});

// Mover arquivos
let moved = 0;
moves.forEach(({ from, to }) => {
  if (fs.existsSync(from) && !fs.existsSync(to)) {
    try {
      fs.copyFileSync(from, to);
      console.log(`✅ Movido: ${from} → ${to}`);
      moved++;
    } catch (e) {
      console.log(`⚠️  Não foi possível mover: ${from}`);
    }
  }
});

if (moved === 0) {
  console.log('\n⚠️  Nenhum arquivo foi movido.');
  console.log('Por favor, organize manualmente:\n');
  console.log('Estrutura correta:');
  console.log('icon-guardian/');
  console.log('├── src/');
  console.log('│   ├── main.ts');
  console.log('│   ├── ui.ts');
  console.log('│   ├── ui.html');
  console.log('│   ├── styles.css');
  console.log('│   ├── types.ts');
  console.log('│   └── utils/');
  console.log('│       ├── svg-parser.ts');
  console.log('│       ├── variant-utils.ts');
  console.log('│       ├── layout-utils.ts');
  console.log('│       ├── audit-engine.ts');
  console.log('│       └── fix-engine.ts');
  console.log('├── manifest.json');
  console.log('├── package.json');
  console.log('└── build.js');
} else {
  console.log(`\n✅ ${moved} arquivo(s) reorganizado(s) com sucesso!`);
  console.log('\nAgora execute:');
  console.log('  npm run build');
}
