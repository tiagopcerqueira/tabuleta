/* ============================================================
   Encaixe do menu na folha/canvas.

   O fator `--fit` multiplica todos os tamanhos do menu. A questão é encontrar
   o maior fator com que o conteúdo ainda cabe.

   A versão anterior descia em passos fixos de 0.02 a partir de um palpite,
   até sessenta vezes, lendo `scrollHeight` e escrevendo `--fit` alternadamente.
   Cada leitura obrigava o navegador a refazer o layout que a escrita anterior
   tinha invalidado, e isto acontecia a cada tecla escrita. Num tablet barato —
   que é o equipamento onde esta app vive — dava para sentir.

   A bisseção chega ao mesmo fator (dentro da tolerância) com cerca de sete
   medições em vez de sessenta, independentemente de quão errado esteja o
   palpite inicial.

   A medição em si é injetada, por isso toda esta lógica é testável sem browser.
   ============================================================ */

export const FIT_MIN = 0.45;
export const FIT_MAX = 1.5;
/** Abaixo deste fator o texto fica pequeno de mais — a interface avisa. */
export const FIT_WARN_BELOW = 0.62;

const TOLERANCE = 0.01;
const MAX_STEPS = 12;

/**
 * Palpite inicial a partir do número de itens. Não precisa de estar certo —
 * só de estar perto, para poupar uma ou duas medições.
 */
export function initialFit(count, format = "print") {
  const guess = ceilingFor(count);
  // O story tem uma tela muito mais alta do que a folha para o mesmo texto:
  // com o teto do papel sobrava sempre uma faixa vazia em cima e em baixo.
  return format === "story" ? Math.min(FIT_MAX, guess * 1.18) : guess;
}

function ceilingFor(count) {
  if (count <= 4) return FIT_MAX;
  if (count <= 6) return 1.28;
  if (count <= 8) return 1.1;
  if (count <= 10) return 0.96;
  if (count <= 13) return 0.85;
  return 0.75;
}

/**
 * Maior fator em [min, max] com que `overflows(fit)` é falso.
 *
 * `overflows` é uma função que aplica o fator e diz se o conteúdo transborda.
 * Assume-se que é monótona: se transborda a um dado fator, transborda a
 * qualquer fator maior. É o caso aqui, porque `--fit` só escala tamanhos.
 *
 * Devolve { fit, steps } — `steps` serve para medir o custo em testes.
 */
export function solveFit(overflows, { min = FIT_MIN, max = FIT_MAX, tolerance = TOLERANCE } = {}) {
  let steps = 0;

  // Caso comum: cabe já no tamanho máximo, e uma única medição resolve.
  steps++;
  if (!overflows(max)) return { fit: max, steps };

  // Nem no mínimo cabe: não há melhor do que o mínimo.
  steps++;
  if (overflows(min)) return { fit: min, steps };

  let baixo = min; // cabe
  let alto = max; // não cabe
  let guard = 0;

  while (alto - baixo > tolerance && guard < MAX_STEPS) {
    const meio = (baixo + alto) / 2;
    steps++;
    guard++;
    if (overflows(meio)) alto = meio;
    else baixo = meio;
  }

  return { fit: baixo, steps };
}

export function shouldWarnAboutFit(fit) {
  return fit < FIT_WARN_BELOW;
}
