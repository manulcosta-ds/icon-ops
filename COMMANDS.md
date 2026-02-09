# Icon Guardian - Comandos Rápidos

## 🚀 Setup Inicial

```bash
# Clone ou descompacte o plugin
cd icon-guardian

# Instale as dependências
npm install

# Build (método recomendado - esbuild)
npm run build

# Verifique se tudo está OK
npm run verify

# OU Build alternativo (Vite)
npm run build:vite
```

## ✅ Verificar Build

```bash
# Ver arquivos gerados
ls -la dist/

# Deve mostrar:
# main.js  (~200KB)
# ui.html  (~60KB)
```

## 🔧 Desenvolvimento

```bash
# Build automático ao salvar (futuro)
npm run watch
```

## 📦 Estrutura de Pastas

```
icon-guardian/
├── manifest.json         ← Aponte aqui no Figma
├── package.json
├── build.js              ← Script de build
├── dist/                 ← Gerado pelo build
│   ├── main.js
│   └── ui.html
└── src/
    ├── main.ts
    ├── ui.html
    ├── ui.ts
    ├── styles.css
    ├── types.ts
    └── utils/
```

## 🎨 Carregar no Figma

1. **Abra Figma Desktop**
2. Menu: **Plugins** → **Development** → **Import plugin from manifest...**
3. Navegue até a pasta `icon-guardian/`
4. Selecione `manifest.json`
5. Pronto! Plugin aparece em **Plugins** → **Development** → **Icon Guardian**

## 🐛 Troubleshooting Rápido

### Build falhou?
```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### Plugin não aparece no Figma?
- ✅ Certifique-se de que `dist/main.js` e `dist/ui.html` existem
- ✅ Use Figma Desktop (não funciona no browser)
- ✅ Aponte para `manifest.json` (não para dist/)

### Erro "Cannot find module"?
```bash
npm install
```

### Erro no import do ZIP?
- ✅ Arquivo deve ser .zip
- ✅ Deve conter arquivos .svg

## 📚 Documentação

- `README.md` - Documentação completa
- `QUICKSTART.md` - Setup em 5 minutos
- `BUILD_FIX.md` - Solução de problemas de build
- `LIMITATIONS.md` - Limitações e detalhes técnicos
- `FILE_STRUCTURE.md` - Organização do código

## 💡 Uso Rápido

### Importar Ícones
1. Abra o plugin
2. **Import SVG Zip**
3. Selecione seu .zip com SVGs
4. Configure tamanhos (opcional): `16,24,32`
5. **Import Icons**

### Auditar Biblioteca
1. Abra o plugin
2. **Audit Existing Library**
3. Escolha escopo: Page / Selection / All Components
4. **Run Audit**
5. Revise issues encontrados

### Corrigir Issues
1. Após auditar, selecione issues (checkbox)
2. **Fix Selected**
3. Revise preview
4. **Apply Fixes**
5. Use Cmd/Ctrl+Z para desfazer se necessário

## 🎯 Atalhos

| Ação | Como |
|------|------|
| Build | `npm run build` |
| Verificar build | `npm run verify` |
| Limpar | `rm -rf dist node_modules` |
| Reinstalar | `npm install` |
| Ver dist | `ls -la dist/` |
| Rodar plugin | Figma → Plugins → Development → Icon Guardian |

## 📊 Tamanhos Esperados

Após build bem-sucedido:

```bash
$ ls -lh dist/
-rw-r--r--  main.js   (~200K)  # Plugin code + JSZip
-rw-r--r--  ui.html   (~60K)   # UI completa (CSS + JS inline)
```

## ⚡ One-Liner Setup

```bash
npm install && npm run build && npm run verify && echo "✅ Plugin pronto! Carregue manifest.json no Figma Desktop"
```

---

**Tudo funcionando?** Veja `QUICKSTART.md` para tutorial completo.

**Problemas?** Veja `BUILD_FIX.md` para soluções.

**Dúvidas técnicas?** Veja `LIMITATIONS.md` para detalhes de implementação.
