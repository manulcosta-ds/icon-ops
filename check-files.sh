#!/bin/bash

echo "🔍 Verificando arquivos do Icon Guardian..."
echo ""

check_file() {
    if [ -f "$1" ]; then
        size=$(du -h "$1" | cut -f1)
        echo "✅ $1 ($size)"
    else
        echo "❌ $1 - FALTANDO"
    fi
}

echo "📁 Arquivos da raiz:"
check_file "manifest.json"
check_file "package.json"
check_file "build.js"
check_file "tsconfig.json"

echo ""
echo "📁 Arquivos em src/:"
check_file "src/main.ts"
check_file "src/ui.ts"
check_file "src/ui.html"
check_file "src/styles.css"
check_file "src/types.ts"

echo ""
echo "📁 Arquivos em src/utils/:"
check_file "src/utils/svg-parser.ts"
check_file "src/utils/variant-utils.ts"
check_file "src/utils/layout-utils.ts"
check_file "src/utils/audit-engine.ts"
check_file "src/utils/fix-engine.ts"

echo ""
echo "🔧 Estrutura atual:"
ls -R src/ 2>/dev/null || echo "Pasta src/ não encontrada"

echo ""
echo "📋 Próximos passos:"
echo "1. Se faltarem arquivos, organize conforme FIX_STRUCTURE.txt"
echo "2. Execute: npm run build"
echo "3. Execute: npm run verify"
