/* ============================================================
   Tabuleta — arranque e ligações.

   Este ficheiro liga as peças e não contém regras de negócio. Tudo o que é
   decisão sobre dados vive em src/core (puro, testado) e src/data (guardar,
   migrar). Aqui só se traduzem cliques em ações e estado em desenho.
   ============================================================ */

import { todayISO, addDays, formatDatePT } from "./core/date.js";
import { rememberPhrase } from "./core/text.js";
import { MAX_PHRASE_SUGGESTIONS, extractSettings } from "./core/settings.js";
import { emptyDishes, emptyDesserts, copyDesserts, sanitizeDay } from "./core/day.js";
import { collectSuggestions, findPreviousDishesDate, findPreviousDessertsDate } from "./core/history.js";
import { serializeBackup, parseBackup } from "./core/backup.js";
import { buildBackupFileName } from "./core/filename.js";

import { createStorage, StorageFailure } from "./data/storage.js";
import { createRepository } from "./data/repository.js";

import { collectElements } from "./app/dom.js";
import { createStore } from "./app/store.js";
import { createToast } from "./app/toast.js";
import { createModal } from "./app/modal.js";
import { createTheme } from "./app/theme.js";
import { createMenuView } from "./app/menu-view.js";
import { createEditorView, LIST_CONFIG } from "./app/editor-view.js";
import { createExporter } from "./app/exporter.js";
import { loadLogoFromFile } from "./app/logo.js";

const elements = collectElements();

/* ---------------- Dados ---------------- */

const storage = createStorage(typeof localStorage !== "undefined" ? localStorage : null);

const STORAGE_MESSAGES = {
  [StorageFailure.QUOTA]:
    "Sem espaço para guardar. Exporta uma cópia de segurança e apaga dias antigos para libertar espaço.",
  [StorageFailure.UNAVAILABLE]:
    "Este navegador não está a permitir guardar. O trabalho de hoje mantém-se, mas perde-se ao fechar.",
  [StorageFailure.CORRUPT]: "Alguns dados guardados estavam ilegíveis e foram ignorados.",
  [StorageFailure.UNKNOWN]: "Não foi possível guardar. Exporta uma cópia de segurança por precaução.",
};

const toast = createToast(elements.toast);

const repo = createRepository({
  storage,
  onFailure: (reason) => toast.show(STORAGE_MESSAGES[reason] || STORAGE_MESSAGES[StorageFailure.UNKNOWN]),
});

/* ---------------- Estado ---------------- */

function dayIntoState(date) {
  const day = repo.getDay(date);
  return {
    date,
    soup: day ? day.soup : "",
    dishes: day && day.dishes.length ? day.dishes.slice() : emptyDishes(),
    desserts: day && day.desserts.length ? copyDesserts(day.desserts) : emptyDesserts(),
  };
}

const store = createStore(
  {
    ...repo.getSettings(),
    ...dayIntoState(todayISO()),
    /**
     * Sobe apenas quando a ESTRUTURA de uma lista muda — adicionar, remover,
     * reordenar, mudar de dia, importar. Escrever dentro de um campo não a
     * altera, e é isso que impede as linhas de serem recriadas (e o cursor de
     * saltar) a cada tecla.
     */
    listRevision: 0,
  },
  {
    scheduleFrame: (fn) => requestAnimationFrame(fn),
    cancelFrame: (id) => cancelAnimationFrame(id),
  }
);

const getState = () => store.getState();

/** O conteúdo do dia tal como deve ser guardado. */
function currentDay(state = getState()) {
  return sanitizeDay({ soup: state.soup, dishes: state.dishes, desserts: state.desserts });
}

/** Persiste o dia e as definições a partir do estado atual. */
function persist(state = getState()) {
  repo.saveDay(state.date, currentDay(state));
  repo.updateSettings(extractSettings(state));
}

/* ---------------- Vistas ---------------- */

const modal = createModal({
  root: elements.modal,
  backdrop: elements.modalBackdrop,
  closeButton: elements.modalClose,
  card: elements.modal?.querySelector(".pd-modal__card"),
});

const menuView = createMenuView({ elements });

const exporter = createExporter({ elements, getState, toast, modal });

/* ---------------- Ações do editor ---------------- */

/** Qual das listas está em causa, e como se cria um item vazio nela. */
function listField(kind) {
  return LIST_CONFIG[kind].field;
}

function emptyItem(kind) {
  return LIST_CONFIG[kind].priced ? { name: "", price: "" } : "";
}

/** Foco a devolver depois de a lista ser recriada. */
let pendingFocus = null;

/** Alteração ESTRUTURAL: as linhas têm de ser recriadas. */
function updateList(kind, mutate, focusIndex = null) {
  const field = listField(kind);
  const next = getState()[field].slice();
  mutate(next);
  pendingFocus = focusIndex === null ? null : { kind, index: focusIndex };
  store.setState({ [field]: next, listRevision: getState().listRevision + 1 });
}

const actions = {
  /**
   * Escrever num campo altera os dados mas NÃO a estrutura: `listRevision`
   * fica na mesma e as linhas não são recriadas. O campo já mostra o que foi
   * escrito; recriá-lo tirava o cursor de lá.
   */
  setItemName(kind, index, value) {
    const field = listField(kind);
    const next = getState()[field].slice();
    if (LIST_CONFIG[kind].priced) next[index] = { ...next[index], name: value };
    else next[index] = value;
    store.setState({ [field]: next });
  },

  setItemPrice(kind, index, value) {
    const field = listField(kind);
    const next = getState()[field].slice();
    next[index] = { ...next[index], price: value };
    store.setState({ [field]: next });
  },

  insertItemAfter(kind, index) {
    updateList(kind, (list) => list.splice(index + 1, 0, emptyItem(kind)), index + 1);
  },

  appendItem(kind) {
    const field = listField(kind);
    updateList(kind, (list) => list.push(emptyItem(kind)), getState()[field].length);
  },

  moveItem(kind, index, direction) {
    const target = index + direction;
    const field = listField(kind);
    if (target < 0 || target >= getState()[field].length) return;
    updateList(
      kind,
      (list) => {
        [list[index], list[target]] = [list[target], list[index]];
      },
      target
    );
  },

  removeItem(kind, index) {
    updateList(kind, (list) => {
      list.splice(index, 1);
      if (list.length === 0) list.push(emptyItem(kind));
    });
  },

  selectTemplate(id) {
    const key = getState().format === "story" ? "templateStory" : "templatePrint";
    store.setState({ [key]: id });
  },
};

const editorView = createEditorView({ elements, actions });

/* ---------------- Render ---------------- */

/** Tudo o que se vê no menu. */
const MENU_KEYS = [
  "kind",
  "restaurant",
  "tagline",
  "logo",
  "date",
  "soup",
  "dishes",
  "desserts",
  "includes",
  "price",
  "footer",
  "format",
  "templatePrint",
  "templateStory",
];

// As linhas do editor só são recriadas quando a estrutura muda.
store.subscribe(
  (state) => {
    editorView.renderLists(state, pendingFocus);
    pendingFocus = null;
  },
  ["listRevision", "kind"]
);

// A contagem acompanha o que se escreve, sem tocar nos campos.
store.subscribe(
  (state) => {
    editorView.updateCounts(state);
  },
  ["dishes", "desserts"]
);

store.subscribe((state) => {
  menuView.render(state);
}, MENU_KEYS);

store.subscribe(
  (state) => {
    menuView.updateChrome(state);
  },
  ["format", "kind"]
);

store.subscribe(
  (state) => {
    editorView.renderKindToggle(state);
  },
  ["kind"]
);

store.subscribe(
  (state) => {
    editorView.renderFormatToggle(state);
    editorView.renderTemplates(state);
  },
  ["format", "templatePrint", "templateStory"]
);

store.subscribe(
  (state) => {
    editorView.renderLogo(state);
  },
  ["logo"]
);

store.subscribe(
  (state) => {
    editorView.renderPhraseSuggestions(state);
  },
  ["restaurantHistory", "taglineHistory", "footerHistory"]
);

// Guardar acontece a cada alteração, mas a escrita em si é diferida pelo
// repositório — escrever uma tecla já não serializa o histórico inteiro.
store.subscribe((state) => persist(state));

/* ---------------- Sugestões ---------------- */

/**
 * As sugestões vêm do histórico e só mudam quando o histórico muda — mudar de
 * dia, copiar, importar. Antes eram reconstruídas a cada tecla, o que também
 * fechava o menu de sugestões enquanto se escrevia.
 */
function refreshSuggestions() {
  const state = getState();
  editorView.renderSuggestions(collectSuggestions(repo.getDays(), { excludeDate: state.date }));
}

/* ---------------- Campos simples ---------------- */

const SIMPLE_FIELDS = [
  ["restaurant", elements.restaurant],
  ["tagline", elements.tagline],
  ["soup", elements.soup],
  ["price", elements.price],
  ["includes", elements.includes],
  ["footer", elements.footer],
];

SIMPLE_FIELDS.forEach(([key, node]) => {
  node.addEventListener("input", () => store.setState({ [key]: node.value }));
});

// O histórico de frases só regista valores confirmados (blur/Enter), para não
// guardar todas as versões parciais escritas tecla a tecla.
[
  ["restaurant", "restaurantHistory"],
  ["tagline", "taglineHistory"],
  ["footer", "footerHistory"],
].forEach(([key, historyKey]) => {
  elements[key].addEventListener("change", () => {
    const state = getState();
    store.setState({
      [historyKey]: rememberPhrase(state[historyKey], state[key], MAX_PHRASE_SUGGESTIONS),
    });
  });
});

/* ---------------- Dias ---------------- */

/** Altera o estado sabendo que a estrutura das listas mudou. */
function setStateWithLists(patch) {
  store.setState({ ...patch, listRevision: getState().listRevision + 1 });
}

function switchDay(date) {
  if (!date || date === getState().date) return;
  persist();
  repo.flush();
  setStateWithLists(dayIntoState(date));
  elements.date.value = date;
  elements.soup.value = getState().soup;
  refreshSuggestions();
}

elements.date.addEventListener("change", () => {
  if (!elements.date.value) {
    elements.date.value = getState().date;
    return;
  }
  switchDay(elements.date.value);
});
elements.btnDatePrev.addEventListener("click", () => switchDay(addDays(getState().date, -1)));
elements.btnDateNext.addEventListener("click", () => switchDay(addDays(getState().date, 1)));
elements.btnDateToday.addEventListener("click", () => switchDay(todayISO()));

/* ---------------- Copiar de ontem ---------------- */

elements.btnCopyPrev.addEventListener("click", () => {
  persist();
  const date = findPreviousDishesDate(repo.getDays(), getState().date);
  if (!date) {
    toast.show("Ainda não há nenhum menu anterior com pratos guardados.");
    return;
  }
  const day = repo.getDay(date);
  setStateWithLists({ soup: day.soup, dishes: day.dishes.length ? day.dishes.slice() : emptyDishes() });
  elements.soup.value = day.soup;
  toast.show(`Copiado o menu de ${formatDatePT(date)}.`);
});

elements.btnCopyPrevDesserts.addEventListener("click", () => {
  persist();
  const date = findPreviousDessertsDate(repo.getDays(), getState().date);
  if (!date) {
    toast.show("Ainda não há nenhuma sobremesa anterior guardada.");
    return;
  }
  const day = repo.getDay(date);
  setStateWithLists({ desserts: copyDesserts(day.desserts) });
  toast.show(`Copiadas as sobremesas de ${formatDatePT(date)}.`);
});

/* ---------------- Limpar dia ---------------- */

elements.btnClear.addEventListener("click", () => {
  const state = getState();
  const isDesserts = state.kind === "sobremesas";

  // A data faz parte do instantâneo: sem isso, carregar em Anular depois de
  // mudar de dia repunha o conteúdo no dia errado, por cima do que lá estivesse.
  const snapshot = {
    date: state.date,
    soup: state.soup,
    dishes: state.dishes.slice(),
    desserts: copyDesserts(state.desserts),
  };

  setStateWithLists(isDesserts ? { desserts: emptyDesserts() } : { soup: "", dishes: emptyDishes() });
  elements.soup.value = getState().soup;

  toast.show("Dia limpo.", {
    label: "Anular",
    onClick: () => {
      if (getState().date !== snapshot.date) {
        toast.show("Não foi possível anular: entretanto mudaste de dia.");
        return;
      }
      setStateWithLists(
        isDesserts ? { desserts: snapshot.desserts } : { soup: snapshot.soup, dishes: snapshot.dishes }
      );
      elements.soup.value = getState().soup;
    },
  });
});

/* ---------------- Modo e formato ---------------- */

elements.kindToggle?.querySelectorAll(".kind-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const kind = button.getAttribute("data-kind");
    if (kind === "prato" || kind === "sobremesas") store.setState({ kind });
  });
});

elements.formatToggle?.querySelectorAll(".format-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const format = button.getAttribute("data-format") === "story" ? "story" : "print";
    store.setState({ format });
  });
});

elements.addDish.addEventListener("click", () => actions.appendItem("prato"));
elements.addDessert?.addEventListener("click", () => actions.appendItem("sobremesas"));

/* ---------------- Logótipo ---------------- */

elements.btnLogo?.addEventListener("click", () => elements.inLogo.click());

elements.inLogo?.addEventListener("change", async () => {
  const file = elements.inLogo.files && elements.inLogo.files[0];
  elements.inLogo.value = "";
  if (!file) return;
  try {
    store.setState({ logo: await loadLogoFromFile(file) });
  } catch (error) {
    toast.show(error.message || "Não foi possível ler essa imagem.");
  }
});

elements.btnLogoRemove?.addEventListener("click", () => store.setState({ logo: "" }));

/* ---------------- Exportar / imprimir ---------------- */

elements.btnPrint.addEventListener("click", () => exporter.printOrShare());
elements.btnImage.addEventListener("click", () => exporter.saveImage());
elements.modalPrint.addEventListener("click", () => exporter.printCurrentPreview());

/* ---------------- Cópia de segurança ---------------- */

const RESTRICTED_EXPORT_MESSAGE =
  "Aqui na pré-visualização não é possível descarregar. Abre a app publicada (link) — aí funciona.";

elements.btnExport.addEventListener("click", () => {
  persist();
  repo.flush();
  try {
    const text = serializeBackup(getState(), repo.getDays());
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = buildBackupFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.show(RESTRICTED_EXPORT_MESSAGE);
  }
});

elements.btnImport.addEventListener("click", () => elements.inImport.click());

elements.inImport.addEventListener("change", () => {
  const file = elements.inImport.files && elements.inImport.files[0];
  elements.inImport.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => applyImport(String(reader.result || ""));
  reader.onerror = () => toast.show("Não foi possível ler esse ficheiro.");
  reader.readAsText(file);
});

const IMPORT_ERRORS = {
  json: "Ficheiro inválido — exporta primeiro uma cópia a partir da app.",
  app: "Esse ficheiro é de outra aplicação.",
  shape: "Ficheiro inválido — exporta primeiro uma cópia a partir da app.",
  version: "Essa cópia foi feita por uma versão mais recente da app.",
};

function applyImport(text) {
  const result = parseBackup(text);
  if (!result.ok) {
    toast.show(IMPORT_ERRORS[result.reason] || IMPORT_ERRORS.shape);
    return;
  }

  persist();
  const before = repo.snapshot();

  repo.replaceAll(result.settings, result.days);
  reloadFromRepository();

  toast.show("Dados importados.", {
    label: "Anular",
    onClick: () => {
      repo.replaceAll(before.settings, before.days);
      reloadFromRepository();
      toast.show("Importação anulada.");
    },
  });
}

/** Volta a ler tudo do repositório para o estado e redesenha. */
function reloadFromRepository() {
  setStateWithLists({ ...repo.getSettings(), ...dayIntoState(getState().date) });
  store.flush();
  editorView.fillFields(getState());
  editorView.renderKindToggle(getState());
  editorView.renderFormatToggle(getState());
  editorView.renderTemplates(getState());
  editorView.renderLogo(getState());
  editorView.renderPhraseSuggestions(getState());
  menuView.updateChrome(getState());
  refreshSuggestions();
}

/* ---------------- Tema ---------------- */

createTheme({ storage, button: elements.btnTheme }).init();

/* ---------------- Redimensionamento ---------------- */

// O redimensionamento dispara em rajada — em telemóvel, sempre que a barra de
// endereço aparece ou desaparece. Sem isto, cada evento provocava um encaixe
// completo.
let resizeFrame = null;
window.addEventListener("resize", () => {
  if (resizeFrame !== null) return;
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null;
    menuView.refit(getState());
  });
});

/**
 * Garante que nada fica por gravar quando a app é fechada ou passa a segundo
 * plano — em telemóvel, "visibilitychange" é muitas vezes o único aviso.
 *
 * A ordem importa e não é óbvia. O navegador não corre requestAnimationFrame
 * em separadores ocultos, por isso um render agendado pode nunca chegar a
 * acontecer — e é no render que o estado passa ao repositório. Sem o
 * `store.flush()` primeiro, o `repo.flush()` gravaria uma versão anterior e as
 * últimas palavras escritas perder-se-iam por se ter mudado de separador.
 */
function flushEverything() {
  store.flush();
  persist();
  repo.flush();
}

window.addEventListener("pagehide", flushEverything);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushEverything();
});

/* ---------------- Arranque ---------------- */

// Semeia o histórico de frases com o que já estava guardado, para ficar
// disponível como sugestão sem ser preciso reescrever.
store.setState({
  restaurantHistory: rememberPhrase(
    getState().restaurantHistory,
    getState().restaurant,
    MAX_PHRASE_SUGGESTIONS
  ),
  taglineHistory: rememberPhrase(getState().taglineHistory, getState().tagline, MAX_PHRASE_SUGGESTIONS),
  footerHistory: rememberPhrase(getState().footerHistory, getState().footer, MAX_PHRASE_SUGGESTIONS),
});

editorView.fillFields(getState());
editorView.renderKindToggle(getState());
editorView.renderFormatToggle(getState());
editorView.renderTemplates(getState());
editorView.renderLogo(getState());
editorView.renderLists(getState());
editorView.renderPhraseSuggestions(getState());
menuView.updateChrome(getState());
menuView.render(getState());
refreshSuggestions();

if (repo.migratedFrom !== null) {
  console.warn(`Dados migrados do esquema v${repo.migratedFrom}.`);
}

/* ---------------- PWA ---------------- */

/**
 * Em desenvolvimento o service worker não é registado.
 *
 * A cache serve os módulos da versão anterior, e uma alteração ao código passa
 * a ser invisível por mais que se recarregue — com o agravante de parecer que
 * a alteração não funciona, em vez de parecer que não chegou. Em produção o
 * comportamento é o de sempre.
 */
const isDevelopment = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

if ("serviceWorker" in navigator && !isDevelopment) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* sem service worker a app continua a funcionar, só não fica offline */
    });
  });
}
