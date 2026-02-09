# 🚀 START HERE - Icon Guardian

## ⚡ Quick Setup (3 passos)

### 1️⃣ Baixe o arquivo `build.js` atualizado

**IMPORTANTE**: Substitua o arquivo `build.js` na pasta do seu projeto pelo arquivo atualizado que está nos downloads.

O novo `build.js` tem paths absolutos que resolvem o erro de build.

### 2️⃣ Execute os comandos

```bash
# Certifique-se de estar na pasta icon-guardian
cd icon-guardian

# Instale as dependências (se ainda não fez)
npm install

# Build (agora vai funcionar!)
npm run build

# Verifique se tudo está OK (opcional mas recomendado)
npm run verify
```

**Você deve ver:**
```
✅ main.js built successfully
✅ ui.html built successfully
```

**E no verify:**
```
✅ Source files exist
✅ Utils folder exists
✅ Manifest exists
✅ Build script exists
✅ node_modules installed
✅ dist/main.js exists
✅ dist/ui.html exists
✅ main.js has content
✅ ui.html has content

🎉 All checks passed! Plugin is ready to use.
```

### 3️⃣ Carregue no Figma

1. Abra **Figma Desktop App** (não browser)
2. **Plugins** → **Development** → **Import plugin from manifest...**
3. Navegue até a pasta `icon-guardian/`
4. Selecione `manifest.json`
5. ✅ Pronto! Plugin disponível em **Plugins** → **Development** → **Icon Guardian**

---

## 🔍 Verificação

Após `npm run build`, verifique:

```bash
ls -la dist/
```

Deve mostrar:
- `main.js` (~150-200KB)
- `ui.html` (~50-70KB)

Se ambos existirem, está tudo certo! 🎉

---

## ❌ Se o build ainda falhar

### Opção A: Limpar tudo e recomeçar

```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### Opção B: Verificar se os arquivos src/ existem

```bash
ls -la src/
ls -la src/utils/
```

Deve mostrar:
- `src/main.ts`
- `src/ui.ts`
- `src/ui.html`
- `src/styles.css`
- `src/types.ts`
- `src/utils/` com 5 arquivos .ts

Se faltarem arquivos, baixe o plugin completo novamente.

---

## 📚 Próximos Passos

Depois de carregar no Figma:

1. **Teste rápido**: Abra o plugin e clique em "Import SVG Zip"
2. **Leia a doc**: Veja `QUICKSTART.md` para tutorial completo
3. **Use**: Veja `COMMANDS.md` para referência rápida

---

## 🆘 Problemas?

1. **Build falha**: Veja `BUILD_FIX.md`
2. **Plugin não carrega**: Certifique-se de usar Figma Desktop (não web)
3. **Erro de importação**: Verifique se o ZIP contém arquivos .svg

---

## ✅ Checklist Final

Antes de usar no Figma, confirme:

- [x] `npm install` executado com sucesso
- [x] `npm run build` mostrou ✅ para main.js e ui.html
- [x] Pasta `dist/` existe com main.js e ui.html
- [x] Figma Desktop App instalado (não a versão web)
- [x] `manifest.json` na raiz do projeto

Tudo OK? Carregue no Figma e aproveite! 🎨
