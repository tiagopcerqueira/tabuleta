/* ============================================================
   Armazenamento — a única porta para o localStorage.

   Devolve resultados em vez de lançar, e distingue POR QUE RAZÃO uma gravação
   falhou. Essa distinção é a razão de ser deste ficheiro: antes, quatro blocos
   `catch {}` vazios engoliam todas as falhas por igual, e o caso realista —
   o armazenamento cheio — passava despercebido. O restaurante escrevia o menu,
   a gravação falhava, a app continuava a parecer normal, e o trabalho
   desaparecia ao recarregar a página.
   ============================================================ */

export const StorageFailure = {
  /** Não há localStorage (modo privado antigo, política do navegador, file:// restrito). */
  UNAVAILABLE: "unavailable",
  /** O armazenamento está cheio — o caso que era engolido em silêncio. */
  QUOTA: "quota",
  /** O que lá está não é JSON válido — dados de outra app ou corrompidos. */
  CORRUPT: "corrupt",
  UNKNOWN: "unknown",
};

/**
 * Os navegadores sinalizam "cheio" de três maneiras diferentes; o Firefox usa
 * um código próprio e alguns navegadores antigos só preenchem `code`.
 */
function isQuotaError(error) {
  if (!error) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

/** Confirma que o backend responde de facto — tê-lo definido não chega. */
function probe(backend) {
  if (!backend) return false;
  try {
    const key = "__pd_probe__";
    backend.setItem(key, "1");
    backend.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cria uma vista sobre um backend com a interface do localStorage.
 * O backend é injetado para que os testes possam correr sem browser.
 */
export function createStorage(backend) {
  const available = probe(backend);

  function readJSON(key) {
    if (!available) return { ok: false, reason: StorageFailure.UNAVAILABLE };
    let raw;
    try {
      raw = backend.getItem(key);
    } catch {
      return { ok: false, reason: StorageFailure.UNAVAILABLE };
    }
    if (raw == null) return { ok: true, value: null };
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false, reason: StorageFailure.CORRUPT };
    }
  }

  function writeJSON(key, value) {
    if (!available) return { ok: false, reason: StorageFailure.UNAVAILABLE };
    try {
      backend.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: isQuotaError(error) ? StorageFailure.QUOTA : StorageFailure.UNKNOWN,
        error,
      };
    }
  }

  function readText(key) {
    if (!available) return { ok: false, reason: StorageFailure.UNAVAILABLE };
    try {
      return { ok: true, value: backend.getItem(key) };
    } catch {
      return { ok: false, reason: StorageFailure.UNAVAILABLE };
    }
  }

  function writeText(key, value) {
    if (!available) return { ok: false, reason: StorageFailure.UNAVAILABLE };
    try {
      backend.setItem(key, value);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: isQuotaError(error) ? StorageFailure.QUOTA : StorageFailure.UNKNOWN,
        error,
      };
    }
  }

  function remove(key) {
    if (!available) return { ok: false, reason: StorageFailure.UNAVAILABLE };
    try {
      backend.removeItem(key);
      return { ok: true };
    } catch {
      return { ok: false, reason: StorageFailure.UNKNOWN };
    }
  }

  /** Percorre as chaves pela API padrão (length/key), que existe em qualquer Storage. */
  function keys() {
    if (!available) return [];
    try {
      const out = [];
      for (let i = 0; i < backend.length; i++) {
        const key = backend.key(i);
        if (key != null) out.push(key);
      }
      return out;
    } catch {
      return [];
    }
  }

  return { available, readJSON, writeJSON, readText, writeText, remove, keys };
}

/**
 * Um backend em memória com a mesma interface do localStorage — usado nos testes
 * e como recurso quando o navegador não oferece armazenamento. Neste último caso
 * a app continua a funcionar durante a sessão; só não sobrevive a um recarregar.
 *
 * `limit` simula um armazenamento cheio, para se poder testar o caminho de quota
 * sem depender do navegador.
 */
export function createMemoryBackend(initial = {}, { limit = Infinity } = {}) {
  const map = new Map(Object.entries(initial));

  const usedBytes = (skipKey) => {
    let total = 0;
    for (const [key, value] of map) {
      if (key === skipKey) continue;
      total += key.length + String(value).length;
    }
    return total;
  };

  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem(key, value) {
      const text = String(value);
      if (usedBytes(key) + key.length + text.length > limit) {
        const error = new Error("quota");
        error.name = "QuotaExceededError";
        throw error;
      }
      map.set(key, text);
    },
    removeItem: (key) => void map.delete(key),
    get length() {
      return map.size;
    },
    key: (i) => Array.from(map.keys())[i] ?? null,
  };
}
