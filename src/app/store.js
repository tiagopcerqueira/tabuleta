/* ============================================================
   Store — o único sítio onde o estado muda.

   Existe para fechar uma classe inteira de defeitos. Antes, o estado era um
   objeto global mutado diretamente em cerca de quarenta sítios, e cada um
   decidia à mão o que redesenhar a seguir. Bastava um sítio novo esquecer-se
   de chamar uma das funções de render para a interface ficar a mostrar dados
   antigos — sem erro nenhum, sem nada a assinalar o problema.

   Agora quem muda o estado não escolhe o que redesenhar: declara o que mudou
   e o store agrega tudo num único render por frame.
   ============================================================ */

export function createStore(initialState, { scheduleFrame, cancelFrame } = {}) {
  // Envolvidos em funções próprias: passar as funções do temporizador sem as
  // ligar ao objeto global faz o navegador lançar "Illegal invocation".
  const schedule = scheduleFrame || ((fn) => setTimeout(fn, 0));
  const cancel = cancelFrame || ((id) => clearTimeout(id));

  let state = { ...initialState };
  const listeners = new Set();

  let frame = null;
  /** Campos alterados desde o último render — acumulados entre frames. */
  let pendingKeys = new Set();

  function getState() {
    return state;
  }

  /**
   * Aplica uma alteração. Aceita um objeto de campos ou uma função do estado
   * atual. Campos cujo valor não muda de facto não desencadeiam render.
   */
  function setState(patch, { immediate = false } = {}) {
    const next = typeof patch === "function" ? patch(state) : patch;
    if (!next) return state;

    const changed = [];
    for (const key of Object.keys(next)) {
      if (!Object.is(state[key], next[key])) changed.push(key);
    }
    if (changed.length === 0) return state;

    state = { ...state, ...next };
    changed.forEach((key) => pendingKeys.add(key));

    if (immediate) {
      flush();
    } else if (frame === null) {
      frame = schedule(() => {
        frame = null;
        flush();
      });
    }
    return state;
  }

  /**
   * Assinala que algo mudou fora do estado (por exemplo, o histórico guardado)
   * e que os interessados devem voltar a desenhar.
   */
  function invalidate(...keys) {
    keys.forEach((key) => pendingKeys.add(key));
    if (frame === null) {
      frame = schedule(() => {
        frame = null;
        flush();
      });
    }
  }

  function flush() {
    if (frame !== null) {
      cancel(frame);
      frame = null;
    }
    if (pendingKeys.size === 0) return;
    const changed = pendingKeys;
    pendingKeys = new Set();
    for (const listener of listeners) listener(state, changed);
  }

  /**
   * `keys` limita o listener aos campos que lhe interessam; sem `keys`, corre
   * sempre. Devolve a função que cancela a subscrição.
   */
  function subscribe(listener, keys = null) {
    const wrapped =
      keys === null
        ? listener
        : (nextState, changed) => {
            for (const key of keys) {
              if (changed.has(key)) return listener(nextState, changed);
            }
            return undefined;
          };
    listeners.add(wrapped);
    return () => listeners.delete(wrapped);
  }

  return { getState, setState, invalidate, subscribe, flush };
}
