# 🍲 Tabuleta — Menu do Dia

**O prato do dia do teu restaurante, pronto a imprimir ou a publicar em 10 segundos.**

Escreve a sopa e os pratos numa interface simples, e a Tabuleta gera um **menu bonito**
para mostrar aos clientes — pronto a **imprimir em A4** ou a **publicar nos stories do
Instagram e Facebook**.

Feita para ser fácil de usar por qualquer pessoa, sem instalação e **sem precisar de internet**.

## Como funciona

O **prato do dia** inclui sempre: **sopa, pão, bebida, café e um prato à escolha**.
O utilizador só precisa de escrever **a sopa** e a **lista de pratos disponíveis** nesse dia
(podem ser 4, 5 ou 10+). O template encaixa tudo **numa única folha A4** e **ajusta o
espaçamento e o tamanho do texto** automaticamente conforme o número de pratos.

## Como usar

1. Abre o **endereço publicado** da app no navegador (ou, em desenvolvimento, corre `npm run serve`).
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
  - Imprimir (fundo branco): **Clássico**, **Moderno**, **Bistrô**, **Solar**.
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

Aloja a pasta online (por exemplo, GitHub Pages — é grátis) e abre o endereço no
dispositivo: o navegador oferece **"Instalar aplicação"** e a app fica no ecrã inicial
com ícone próprio, a funcionar mesmo sem internet.

> Nota técnica: a app usa módulos ES, que os navegadores não carregam a partir de
> `file://`. É preciso servi-la por `http`/`https` — o endereço publicado, ou
> `npm run serve` em desenvolvimento.

## Estrutura do projeto

```
index.html                 → página principal (editor + pré-visualização)
manifest.json              → manifesto PWA (nome, ícones, cores de instalação)
sw.js                      → service worker (gerado por npm run release)

styles/                    → carregados por esta ordem; base define o que os outros usam
  base.css                 → tipos de letra, variáveis de cor, reset
  app.css                  → interface: barra, editor, listas, modal, avisos
  menu.css                 → estrutura do menu (A4 e 9:16) e regras de impressão
  templates.css            → os 8 templates: cor, tipografia, decoração

src/main.js                → arranque: liga as peças, sem regras de negócio
src/core/                  → regras puras, sem DOM — testáveis sem navegador
  settings.js              → descritor único dos campos das definições
  day.js · history.js      → o menu de um dia e o histórico
  date.js · text.js        → datas em hora local, escape de HTML, sugestões
  menu-html.js             → marcação do menu
  fit.js                   → encaixe do conteúdo na folha/canvas
  backup.js                → exportar e importar
  templates.js · filename.js
src/data/                  → guardar, migrar, recuperar
  storage.js               → localStorage com erros distinguíveis (cheio ≠ indisponível)
  migrations.js            → migrações de esquema, versionadas e testadas
  repository.js            → histórico em memória, gravação diferida
  keys.js                  → chaves de armazenamento
src/app/                   → interface
  store.js                 → estado num ponto único, um render por frame
  editor-view.js · menu-view.js · exporter.js · modal.js · toast.js · theme.js · logo.js

test/                      → 145 testes (node --test)
tools/                     → release.js (versionamento) e serve.js (servidor local)
assets/                    → html2canvas, tipos de letra e ícones (todos locais)
```

## Desenvolvimento

A app **não tem passo de compilação**: os ficheiros são servidos tal e qual. O `npm`
existe apenas para as ferramentas de desenvolvimento — quem só quer usar a app não
precisa de instalar nada.

```bash
npm install        # só ferramentas de desenvolvimento
npm run serve      # http://localhost:8080
npm test           # 145 testes, sem framework
npm run check      # lint + formatação + testes (o mesmo que o CI corre)
npm run release    # aplica a versão do package.json a todos os ficheiros
```

Notas para quem for mexer no código:

- **As regras vivem em `src/core`.** É código puro, sem DOM, com testes. Uma alteração
  a como os dados se comportam pertence aí, e deve trazer um teste.
- **Um campo novo nas definições acrescenta-se numa linha**, em `SETTINGS_FIELDS`. Os
  valores por omissão, a sanitização e a exportação derivam daí — foi a duplicação
  destas três listas que produziu o defeito que corrompia as sobremesas.
- **Nunca gravar diretamente no `localStorage`.** Passar sempre pelo repositório, que
  distingue "cheio" de "indisponível" e comunica falhas ao utilizador.
- **Um template novo são duas coisas:** um bloco em `styles/templates.css` e uma entrada
  em `src/core/templates.js`. Não mexer em `styles/menu.css` — se um template precisar de
  mudar a estrutura, é sinal de que a estrutura tem de ganhar uma variável, não uma exceção.
- **Não editar a versão à mão.** `npm run release` escreve-a no `index.html`, no `sw.js`
  e no manifesto, e gera a lista de ficheiros offline varrendo `src/`.
- O service worker **não é registado em `localhost`**, para que uma alteração ao código
  não fique escondida atrás da cache.

## Notas técnicas

- App **100% estática** (HTML + CSS + módulos ES), sem dependências em execução além do
  html2canvas, que está incluído.
- Os dados ficam guardados localmente no navegador (`localStorage`) — não são enviados
  para lado nenhum.
- Migrações automáticas a partir dos esquemas anteriores. As chaves antigas **não são
  apagadas**, para que seja sempre possível voltar a uma versão anterior sem perder nada.
- Para uma melhor impressão, no diálogo de impressão ativa "Gráficos de fundo" caso as
  cores não apareçam.

## Licença

MIT — ver [LICENSE](LICENSE). Componentes de terceiros (html2canvas e os tipos de letra)
em [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
