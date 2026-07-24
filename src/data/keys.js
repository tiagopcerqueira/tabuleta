/* ============================================================
   Chaves de armazenamento.

   Todas as chaves de conteúdo levam um identificador de loja. Hoje há sempre
   uma só loja ("default") e nada na interface o mostra — mas o prefixo tem de
   existir no esquema desde já: introduzi-lo mais tarde obrigaria a migrar os
   dados de restaurantes reais em vez de mudar uma constante.

   O tema da interface fica FORA do prefixo: é uma preferência do dispositivo,
   não da loja.
   ============================================================ */

export const NAMESPACE = "prato-do-dia";
export const SCHEMA_VERSION = 4;
export const DEFAULT_STORE_ID = "default";

/** Chaves de conteúdo, por loja. */
export function storeKeys(storeId = DEFAULT_STORE_ID) {
  const base = `${NAMESPACE}:${storeId}`;
  return {
    settings: `${base}:settings:v${SCHEMA_VERSION}`,
    history: `${base}:history:v${SCHEMA_VERSION}`,
    /**
     * O logótipo vive numa chave própria, não dentro das definições.
     *
     * É, de longe, o maior valor guardado (uma imagem embebida em texto), e as
     * definições são reescritas sempre que se confirma um campo. Separá-los
     * evita reescrever a imagem inteira para gravar uma frase de rodapé.
     */
    logo: `${base}:logo:v${SCHEMA_VERSION}`,
  };
}

/** Chaves globais ao dispositivo, independentes da loja. */
export const GLOBAL_KEYS = {
  meta: `${NAMESPACE}:meta`,
  uiTheme: `${NAMESPACE}:ui-theme`,
};

/** Chaves dos esquemas anteriores — lidas uma vez pela migração, nunca escritas. */
export const LEGACY_KEYS = {
  v2: `${NAMESPACE}:v2`,
  v3: `${NAMESPACE}:v3`,
  historyV1: `${NAMESPACE}:history:v1`,
};
