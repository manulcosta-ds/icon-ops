# Build Fix - Resolução do Erro

## ❌ Problema Original

```
Could not resolve entry module "src/main.ts"
```

Este erro acontecia porque o Vite não estava encontrando os arquivos de entrada corretamente.

## ✅ Solução Implementada

Foram feitas duas mudanças:

### 1. Script de Build Alternativo com esbuild

Criei um arquivo `build.js` que usa esbuild diretamente. Este é o método **recomendado** e mais simples para plugins Figma.

**Para usar:**
```bash
npm install
npm run build
```

O script `build.js`:
- Compila `main.ts` → `dist/main.js`
- Compila `ui.ts` e inline tudo em `dist/ui.html`
- Inclui CSS e JS diretamente no HTML final
- Mais rápido e confiável para plugins Figma

### 2. Vite Config Corrigido (Alternativa)

Se preferir usar Vite, o `vite.config.ts` foi corrigido com:
- Paths absolutos usando `resolve(__dirname)`
- Configurações corretas para plugins Figma

**Para usar:**
```bash
npm install
npm run build:vite
```

## 🚀 Instruções de Build

### Método 1: esbuild (Recomendado)

```bash
# 1. Instalar dependências
npm install

# 2. Build
npm run build

# 3. Verificar saída
ls -la dist/
# Deve mostrar: main.js e ui.html
```

### Método 2: Vite (Alternativa)

```bash
# 1. Instalar dependências
npm install

# 2. Build com Vite
npm run build:vite

# 3. Verificar saída
ls -la dist/
```

## 📁 Estrutura Esperada Após Build

```
dist/
├── main.js      # ~200KB (inclui JSZip bundled)
└── ui.html      # ~60KB (CSS + JS inline)
```

## 🔍 Troubleshooting

### "Cannot find module 'esbuild'"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "Permission denied"
```bash
chmod +x build.js
npm run build
```

### Dist folder vazia
```bash
# Certifique-se que os arquivos src/ existem
ls -la src/
ls -la src/utils/

# Se faltarem arquivos, re-baixe o plugin completo
```

### Build bem-sucedido mas plugin não carrega no Figma

Verifique:
1. ✅ `dist/main.js` existe e tem ~200KB
2. ✅ `dist/ui.html` existe e tem ~60KB
3. ✅ `manifest.json` está na raiz do projeto
4. ✅ Usando Figma Desktop (não web)

## 🎯 Próximos Passos

Após o build bem-sucedido:

1. **Abra Figma Desktop**
2. **Plugins** → **Development** → **Import plugin from manifest...**
3. Navegue até a pasta `icon-guardian`
4. Selecione `manifest.json`
5. Plugin aparece em **Plugins** → **Development** → **Icon Guardian**

## 📝 Notas Técnicas

### Por que esbuild?

- **Mais simples**: Menos configuração
- **Mais rápido**: Build em <1 segundo
- **Mais confiável**: Padrão da comunidade Figma
- **Inline automático**: CSS e JS bundled no HTML

### Por que Vite deu erro?

- Paths relativos vs absolutos
- Configuração mais complexa
- Nem sempre ideal para plugins Figma (que precisam de inline)

### Ambos funcionam agora!

Use o que preferir:
- `npm run build` → esbuild (recomendado)
- `npm run build:vite` → Vite (alternativa)

## ✅ Verificação Final

Antes de usar no Figma:

```bash
# Build
npm run build

# Deve ver:
# ✅ main.js built successfully
# ✅ ui.html built successfully

# Verificar tamanhos (aproximados)
ls -lh dist/
# main.js: ~200K
# ui.html: ~60K
```

Se tudo estiver OK, você está pronto para usar o plugin! 🎨
