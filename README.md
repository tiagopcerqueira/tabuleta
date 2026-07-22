# 🍲 Prato do Dia — Gerador de Menu

App simples para o restaurante escrever os **pratos do dia** numa interface intuitiva
e gerar automaticamente um **menu bonito** para mostrar aos clientes — pronto a
imprimir, exportar em PDF ou partilhar como imagem.

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
   - Nome do restaurante e frase (só é preciso na primeira vez — fica guardado).
   - **Sopa do dia**.
   - **Pratos disponíveis** — uma lista simples. Adiciona com **＋** (ou carrega em **Enter** num prato para criar o seguinte), reordena com **▲▼** e remove com **✕**. Enquanto escreves, a app sugere pratos e sopas de dias anteriores.
   - **📋 Copiar de ontem** — recupera o último menu guardado para só ajustares o que mudou.
   - Preço do menu (opcional).
3. À direita vês a **pré-visualização em tempo real** de como o menu vai ficar na folha A4.
4. Quando estiver pronto, usa os botões no topo:
   - **🖨️ Imprimir / PDF** — imprime em A4 ou guarda como PDF (no diálogo de impressão, escolhe "Guardar como PDF").
   - **🖼️ Guardar imagem** — descarrega o menu em PNG, ideal para enviar no WhatsApp ou pôr nas redes sociais.
   - **🧹 Limpar dia** — apaga os pratos para começar um novo dia (mantém o nome do restaurante e o tema). Se te enganares, tens uns segundos para carregar em **Anular**.

## Funcionalidades

- ✅ Interface intuitiva, toda em português. Só se escreve a sopa e os pratos.
- ✅ **Um menu por data** — a app abre sempre no dia de hoje e cada dia guarda o seu menu (últimos 60 dias).
- ✅ Botão "📋 Copiar de ontem" para recuperar o último menu guardado.
- ✅ **Cópia de segurança** — exporta e importa todos os dados num ficheiro JSON.
- ✅ **Sugestões automáticas** de pratos e sopas já usados, enquanto se escreve.
- ✅ Reordenar pratos com ▲▼ e "Limpar dia" com opção de **Anular**.
- ✅ Aviso quando há pratos a mais e o texto do menu ficaria pequeno.
- ✅ Design "Azulejo" com tipografia Fraunces (incluída, funciona offline).
- ✅ Pré-visualização instantânea do menu.
- ✅ **Encaixe automático numa folha A4** — o espaçamento adapta-se a qualquer número de pratos.
- ✅ 4 temas visuais para o menu (Azulejo, Linho, Ardósia, Horta).
- ✅ Modo claro/escuro na própria app (botão 🌙 / ☀️).
- ✅ Data automática, escrita por extenso ("Quarta-feira, 22 de julho de 2026").
- ✅ Impressão em A4 e exportação para PDF.
- ✅ Exportação para imagem PNG para partilhar.
- ✅ Guarda tudo automaticamente no navegador (não perde o trabalho ao fechar).
- ✅ Funciona offline, sem instalação nem servidor.

## Dica: pôr no telemóvel/tablet do restaurante

Copia a pasta para o dispositivo e abre o `index.html` no navegador. Podes adicionar
a página aos favoritos ou ao ecrã inicial para abrir com um toque.

## Estrutura do projeto

```
index.html                 → página principal (editor + pré-visualização)
styles.css                 → estilos da app e do template do menu (incl. impressão A4)
app.js                     → lógica: editor, pré-visualização, gravação, exportação
assets/html2canvas.min.js  → biblioteca para gerar a imagem PNG (incluída, offline)
assets/fonts/*.woff2       → tipografia Fraunces (incluída, funciona offline)
```

## Notas técnicas

- App **100% estática** (HTML + CSS + JavaScript puro), sem dependências de build.
- Os dados ficam guardados localmente no navegador (`localStorage`) — não são enviados para lado nenhum.
- Para uma melhor impressão, no diálogo de impressão ativa "Gráficos de fundo" caso as cores não apareçam.
