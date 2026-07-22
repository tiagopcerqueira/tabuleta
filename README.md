# 🍲 Prato do Dia — Gerador de Menu

App simples para o restaurante escrever os **pratos do dia** numa interface intuitiva
e gerar automaticamente um **menu bonito** para mostrar aos clientes — pronto a
imprimir, exportar em PDF ou partilhar como imagem.

Feita para ser fácil de usar por qualquer pessoa, sem instalação e **sem precisar de internet**.

## Como usar

1. Abre o ficheiro **`index.html`** (basta fazer duplo clique — abre no navegador).
2. À esquerda, escreve os pratos do dia:
   - Nome do restaurante e frase (só é preciso na primeira vez — fica guardado).
   - Sopa, pratos por categoria (Carne, Peixe, …), sobremesa e preço.
   - Podes adicionar/remover categorias e pratos com os botões **＋** e **✕**.
   - Clica no emoji de uma categoria para o trocar.
3. À direita vês a **pré-visualização em tempo real** de como o menu vai ficar.
4. Quando estiver pronto, usa os botões no topo:
   - **🖨️ Imprimir / PDF** — imprime em A4 ou guarda como PDF (no diálogo de impressão, escolhe "Guardar como PDF").
   - **🖼️ Guardar imagem** — descarrega o menu em PNG, ideal para enviar no WhatsApp ou pôr nas redes sociais.
   - **🧹 Limpar dia** — apaga os pratos para começar um novo dia (mantém o nome do restaurante e o tema).

## Funcionalidades

- ✅ Interface intuitiva, toda em português.
- ✅ Pré-visualização instantânea do menu.
- ✅ 4 temas visuais (Taberna, Moderno, Mar, Rústico).
- ✅ Categorias e pratos flexíveis, com preço opcional por prato.
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
```

## Notas técnicas

- App **100% estática** (HTML + CSS + JavaScript puro), sem dependências de build.
- Os dados ficam guardados localmente no navegador (`localStorage`) — não são enviados para lado nenhum.
- Para uma melhor impressão, no diálogo de impressão ativa "Gráficos de fundo" caso as cores não apareçam.
