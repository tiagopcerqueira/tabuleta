# 🍲 Prato do Dia — Gerador de Menu

App simples para o restaurante escrever os **pratos do dia** numa interface intuitiva
e gerar automaticamente um **menu bonito** para mostrar aos clientes — pronto a
**imprimir em A4** ou a **publicar nos stories do Instagram e Facebook**.

Feita para ser fácil de usar por qualquer pessoa, sem instalação e **sem precisar de internet**.

## Como funciona

O **Prato do Dia** inclui sempre: **sopa, pão, bebida, café e um prato à escolha**.
O utilizador só precisa de escrever **a sopa** e a **lista de pratos disponíveis** nesse dia
(podem ser 4, 5 ou 10+). O template encaixa tudo **numa única folha A4** e **ajusta o
espaçamento e o tamanho do texto** automaticamente conforme o número de pratos.

## Como usar

1. Abre o ficheiro **`index.html`** (basta fazer duplo clique — abre no navegador).
2. À esquerda, escreve o dia:
   - **Dia** — cada data guarda o seu menu. Usa **‹ ›** ou o botão **Hoje** para navegar; podes preparar o menu de amanhã sem perder o de hoje.
   - **Marca** — logótipo, nome e frase do restaurante. Define-se **uma vez** e fica em todos os menus (o nome e a frase até sugerem o que já usaste).
   - **Sopa do dia**.
   - **Pratos disponíveis** — uma lista simples. Adiciona com **＋** (ou carrega em **Enter** num prato para criar o seguinte), reordena com **▲▼** e remove com **✕**. Enquanto escreves, a app sugere pratos e sopas de dias anteriores.
   - **📋 Copiar de ontem** — recupera o último menu guardado para só ajustares o que mudou.
   - Preço do menu (opcional).
   - **Modelo do menu** — escolhe onde vais usar (**🖨️ Imprimir A4** ou **📱 Story 9:16**) e um dos **4 templates** de cada formato.
3. À direita vês a **pré-visualização em tempo real** no formato escolhido (folha A4 ou story 9:16).
4. Quando estiver pronto, usa os botões no topo:
   - **🖨️ Imprimir / PDF** (formato Imprimir) — imprime em A4 ou guarda como PDF (no diálogo, escolhe "Guardar como PDF").
   - **📤 Partilhar** (formato Story) — no telemóvel abre logo a partilha do sistema (Instagram, Facebook, WhatsApp…).
   - **🖼️ Guardar imagem** — descarrega o menu em PNG à resolução certa (A4, ou 1080×1920 para stories).
   - **🧹 Limpar dia** — apaga os pratos para começar um novo dia (mantém a marca e o template). Se te enganares, tens uns segundos para carregar em **Anular**.

## Funcionalidades

- ✅ Interface intuitiva, toda em português. Só se escreve a sopa e os pratos.
- ✅ **Dois geradores**: **Prato do dia** e **Sobremesas** — alterna no topo do editor. Cada um tem a sua lista diária independente; a marca e os templates são partilhados.
- ✅ **Dois formatos**: **Imprimir (A4)** e **Story (9:16)** para Instagram/Facebook.
- ✅ **8 templates** que mudam cor, tipografia e disposição:
  - Imprimir (fundo branco): **Clássico**, **Moderno**, **Bistrô**, **Tabuleta**.
  - Story (criativos): **Ardósia**, **Vibrante**, **Fresco**, **Editorial**.
- ✅ **Logótipo** do restaurante (carrega uma imagem — fica em todos os menus).
- ✅ **Marca** definida uma vez (logótipo, nome, frase) com **sugestões** do nome do restaurante e das frases já usadas.
- ✅ Templates de impressão em **branco puro** (poupa tinteiro); logótipo sem moldura (PNG transparente fica limpo).
- ✅ **Um menu por data** — a app abre sempre no dia de hoje e cada dia guarda o seu menu (últimos 60 dias).
- ✅ Botão "📋 Copiar de ontem" para recuperar o último menu guardado.
- ✅ **Cópia de segurança** — exporta e importa todos os dados num ficheiro JSON.
- ✅ **Sugestões automáticas** de pratos e sopas já usados, enquanto se escreve.
- ✅ Reordenar pratos com ▲▼ e "Limpar dia" com opção de **Anular**.
- ✅ Aviso quando há pratos a mais e o texto do menu ficaria pequeno.
- ✅ Tipografia própria (Fraunces, Archivo e Oswald) **incluída, funciona offline**.
- ✅ Pré-visualização instantânea no formato escolhido.
- ✅ **Encaixe automático** — o espaçamento adapta-se a qualquer número de pratos, em A4 ou 9:16.
- ✅ Modo claro/escuro na própria app (botão 🌙 / ☀️).
- ✅ Data automática, escrita por extenso ("Quinta-feira, 23 de julho de 2026").
- ✅ Impressão em A4, exportação para PDF e **partilha direta** nos stories (Web Share).
- ✅ Exportação para imagem PNG à resolução nativa (A4 ou 1080×1920).
- ✅ Guarda tudo automaticamente no navegador (não perde o trabalho ao fechar).
- ✅ Funciona offline, sem instalação nem servidor.
- ✅ **PWA** — quando alojada online (https), instala-se no telemóvel/tablet como uma app, com ícone próprio e offline garantido.

## Dica: pôr no telemóvel/tablet do restaurante

A melhor forma é alojar a pasta online (por exemplo, GitHub Pages — é grátis) e abrir
o endereço no dispositivo: o navegador oferece **"Instalar aplicação"** e a app fica
no ecrã inicial com ícone próprio, a funcionar mesmo sem internet.

Em alternativa, copia a pasta para o dispositivo e abre o `index.html` no navegador
(sem instalação, mas também funciona).

> Nota técnica: a instalação e o offline via service worker exigem `https://` ou
> `localhost` — em `file://` a app funciona normalmente, só não é instalável.

## Estrutura do projeto

```
index.html                 → página principal (editor + pré-visualização)
styles.css                 → estilos da app e do template do menu (incl. impressão A4)
app.js                     → lógica: editor, pré-visualização, gravação, exportação
manifest.json              → manifesto PWA (nome, ícones, cores de instalação)
sw.js                      → service worker: pré-carrega tudo para funcionar offline
assets/html2canvas.min.js  → biblioteca para gerar a imagem PNG (incluída, offline)
assets/fonts/*.woff2       → tipografia Fraunces, Archivo e Oswald (incluídas, offline)
assets/icons/*.png         → ícones da app instalada (192, 512 e maskable)
```

## Notas técnicas

- App **100% estática** (HTML + CSS + JavaScript puro), sem dependências de build.
- Os dados ficam guardados localmente no navegador (`localStorage`) — não são enviados para lado nenhum.
- Para uma melhor impressão, no diálogo de impressão ativa "Gráficos de fundo" caso as cores não apareçam.
