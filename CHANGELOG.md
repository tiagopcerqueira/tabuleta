# Registo de alterações

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versões segundo [SemVer](https://semver.org/lang/pt-BR/).

---

## [11.0.0] — 2026-07-25

Fim do protótipo. A app tem nome próprio, e os identificadores internos deixam
de arrastar o nome anterior.

Esta versão **não lê dados escritos por versões anteriores**. É deliberado: o
que existia era um protótipo sem utilizadores fora do desenvolvimento, e manter
código para converter dados que ninguém tem seria manter caminhos que nada
percorre — e caminhos que nada percorre são caminhos que ninguém verifica.

### Alterado

- **A app chama-se Tabuleta.** "Prato do Dia" era o nome daquilo que o cliente
  produz, não da ferramenta — impossível de proteger como marca e a competir em
  pesquisa com o próprio termo genérico. O prato do dia continua a ser o que a
  app faz, e continua a ser o que se lê no cartaz impresso.
- O prefixo das chaves de armazenamento e a marca dos ficheiros de cópia de
  segurança passam a ser `tabuleta`.
- O esquema de armazenamento **recomeça na versão 1**, e o formato das cópias de
  segurança também. O mecanismo de versão e migração fica montado, para que a
  primeira migração a sério seja um caso a mais e não uma reescrita do arranque.
- O template de impressão passa a chamar-se **Solar** — nome e identificador —,
  para não colidir com o nome da app.
- O nome no diálogo de impressão e na partilha do sistema passa a ser o do
  restaurante, não o da ferramenta: quem imprimia para PDF ficava com
  "Tabuleta.pdf" na pasta de transferências.
- A cópia de segurança chama-se `tabuleta-backup-<data>.json`. O cartaz mantém
  `prato-do-dia-<data>.png` quando não há nome de restaurante, porque esse
  ficheiro descreve o conteúdo e não a aplicação.

### Removido

- Leitura dos esquemas de armazenamento 2, 3 e 4 do protótipo.
- Conversão de sobremesas guardadas como texto simples, e a reparação de dados
  corrompidos pelo defeito de importação — ambas existiam para dados que já não
  existem. A robustez a entradas malformadas mantém-se e continua testada.

---

## [10.0.0] — 2026-07-25

Reestruturação interna completa. **Nenhuma funcionalidade nova e nenhuma
alteração ao que o utilizador vê ou faz** — todo o trabalho foi em correção de
defeitos que causavam perda de dados, arquitetura, desempenho e segurança.

### Corrigido

- **Importar uma cópia de segurança destruía todas as sobremesas.** As
  sobremesas eram convertidas com `String()` sobre um objeto, o que produzia
  `"[object Object]"` — todos os nomes e preços de todos os dias eram perdidos
  em silêncio. Dias já corrompidos por este defeito são agora reparados ao
  serem lidos.
- **Falhas de gravação deixaram de ser silenciosas.** Quatro blocos `catch`
  vazios engoliam todos os erros, incluindo o armazenamento cheio: o menu era
  escrito, a gravação falhava, e o trabalho desaparecia ao recarregar sem
  qualquer aviso. Agora a app explica o que aconteceu e o que fazer.
- **"Copiar de ontem" anunciava sucesso ao copiar nada.** Não verificava se o
  dia anterior tinha mesmo pratos; um dia só com sobremesas dava uma lista
  vazia com a mensagem "Copiado o menu de …".
- **"Anular" podia escrever no dia errado.** Se, nos segundos em que o aviso
  está visível, se mudasse de data, o Anular repunha o conteúdo no dia novo,
  por cima do que lá estivesse. Agora recusa e explica porquê.
- **Datas junto às mudanças de hora.** O cálculo passava por UTC e podia
  devolver o dia anterior nas transições de hora de verão.
- Uma versão nova publicada podia não chegar a quem tinha a app instalada: o
  documento era servido sempre da cache local.
- Um único ficheiro em falta impedia a instalação offline por inteiro.

### Alterado

- **Módulos ES em `src/`** — o `app.js` de 1314 linhas deu lugar a `src/core`
  (regras puras, sem DOM), `src/data` (guardar e migrar) e `src/app` (interface).
  Consequência: a app deixa de abrir por duplo clique no `index.html`; passa a
  precisar do endereço publicado ou de `npm run serve`.
- **CSS dividido em quatro** — o `styles.css` de 1759 linhas deu lugar a
  `styles/base.css` (tipos de letra e variáveis), `styles/app.css` (interface),
  `styles/menu.css` (estrutura do menu e impressão) e `styles/templates.css`
  (os 8 templates). As 249 regras foram verificadas uma a uma: nenhuma se
  perdeu nem apareceu de novo.
- **Encaixe do menu por bisseção** — o mesmo resultado visual com uma medição
  de layout por tecla escrita, em vez de até sessenta.
- **Histórico em memória** — escrever uma tecla já não lê nem serializa todo o
  armazenamento duas vezes; a gravação é diferida e agrupada.
- **Um render por frame** — o estado passa por um ponto único que agrupa as
  alterações, em vez de cada sítio escolher à mão o que redesenhar.
- **Esquema v4** com `updatedAt` por dia e identificador de loja nas chaves.
  Migração automática e testada a partir das versões 2 e 3; **as chaves antigas
  não são apagadas**, para que seja sempre possível voltar atrás.
- O logótipo é guardado em WebP e numa chave própria — várias vezes mais
  pequeno, e gravar uma frase deixou de reescrever a imagem inteira.
- Versão e lista de ficheiros offline geradas por `npm run release`, a partir
  do `package.json`. Antes estavam repetidas à mão em cinco sítios.

### Segurança

- **Content-Security-Policy** restrita: nenhum código embutido, nenhuma origem
  externa.
- O logótipo passa a ser validado como imagem embebida no dispositivo — uma
  cópia de segurança manipulada já não pode fazer a app contactar a rede.

### Acessibilidade

- Modal com foco preso enquanto está aberta e devolvido a quem a abriu.
- Alvos de toque de 44px nos controlos de cada linha.
- Teclado numérico nos campos de preço (`inputmode="decimal"`).
- Avisos passíveis de serem anunciados por leitores de ecrã.
- `<noscript>`, `color-scheme` e metadados de partilha.

### Infraestrutura

- 145 testes automatizados (`node --test`, sem framework).
- ESLint e Prettier, com regras dirigidas aos defeitos que já aconteceram.
- CI no GitHub Actions: lint, formatação, testes e coerência de versões.
- `LICENSE` (MIT) e `THIRD-PARTY-NOTICES.md` (html2canvas MIT, tipos de letra OFL).

---

## [9] — 2026-07-24

- Sobremesas com preço por item, em vez de um preço único.

## [8] — 2026-07-24

- Segundo modo: gerador de sobremesas com saída independente.

## [7] — 2026-07-23

- Impressão em branco puro, logótipo sem moldura, sugestão de nome.

## [6] — 2026-07-23

- Dois formatos (Imprimir A4 e Story 9:16), 8 templates, logótipo e marca.

## [5] — 2026-07-22

- PWA: manifesto, service worker e ícones.

## [4] — 2026-07-22

- Quatro temas novos e cache-busting dos ficheiros estáticos.

## [3] — 2026-07-21

- Um menu por data, navegação entre dias e cópia de segurança.

## [2] — 2026-07-21

- Histórico, copiar de ontem, sugestões, reordenar e anular.

## [1] — 2026-07-20

- Primeira versão: editor de pratos e menu A4 com encaixe automático.
