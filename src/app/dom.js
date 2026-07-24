/* ============================================================
   Referências ao documento, resolvidas uma vez.
   ============================================================ */

const byId = (id) => document.getElementById(id);

export function collectElements() {
  return {
    editor: document.querySelector(".editor"),
    kindToggle: byId("kind-toggle"),

    restaurant: byId("in-restaurant"),
    tagline: byId("in-tagline"),
    date: byId("in-date"),
    soup: byId("in-soup"),
    price: byId("in-price"),
    includes: byId("in-includes"),
    footer: byId("in-footer"),

    btnDatePrev: byId("btn-date-prev"),
    btnDateNext: byId("btn-date-next"),
    btnDateToday: byId("btn-date-today"),

    dishes: byId("dishes"),
    dishCount: byId("dish-count"),
    addDish: byId("btn-add-dish"),
    btnCopyPrev: byId("btn-copy-prev"),

    dessertsList: byId("desserts-list"),
    dessertCount: byId("dessert-count"),
    addDessert: byId("btn-add-dessert"),
    btnCopyPrevDesserts: byId("btn-copy-prev-desserts"),

    dishSuggestions: byId("dish-suggestions"),
    dessertSuggestions: byId("dessert-suggestions"),
    soupSuggestions: byId("soup-suggestions"),
    restaurantSuggestions: byId("restaurant-suggestions"),
    taglineSuggestions: byId("tagline-suggestions"),
    footerSuggestions: byId("footer-suggestions"),

    logoPreview: byId("logo-preview"),
    btnLogo: byId("btn-logo"),
    btnLogoRemove: byId("btn-logo-remove"),
    inLogo: byId("in-logo"),

    formatToggle: byId("format-toggle"),
    templates: byId("templates"),

    menuWrap: byId("menu-wrap"),
    menuScale: byId("menu-scale"),
    menu: byId("menu"),
    previewHint: byId("preview-hint"),
    fitWarning: byId("fit-warning"),

    btnPrint: byId("btn-print"),
    btnImage: byId("btn-image"),
    btnClear: byId("btn-clear"),
    btnTheme: byId("btn-theme"),

    modal: byId("pd-modal"),
    modalBackdrop: byId("pd-modal-backdrop"),
    modalClose: byId("pd-modal-close"),
    modalHint: byId("pd-modal-hint"),
    modalImg: byId("pd-modal-img"),
    modalDownload: byId("pd-modal-download"),
    modalPrint: byId("pd-modal-print"),

    btnExport: byId("btn-export"),
    btnImport: byId("btn-import"),
    inImport: byId("in-import"),

    toast: byId("pd-toast"),
  };
}
