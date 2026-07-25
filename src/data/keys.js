/* ============================================================
   Chaves de armazenamento.

   Todas as chaves de conteúdo levam um identificador de loja. Hoje há sempre
   uma só loja ("default") e nada na interface o mostra — mas o prefixo tem de
   existir no esquema desde já: introduzi-lo mais tarde obrigaria a migrar os
   dados de restaurantes reais em vez de mudar uma constante.

   O tema da interface fica FORA do prefixo: é uma preferência do dispositivo,
   não da loja.
   ============================================================ */

export const NAMESPACE = "tabuleta";

/**
 * Versão do esquema de armazenamento.
 *
 * Recomeça em 1 com a Tabuleta. Os esquemas 2 a 4 pertenciam ao protótipo
 * anterior e nunca chegaram a ter utilizadores fora do desenvolvimento, por
 * isso arrastar código para os ler seria manter caminhos que nada percorre —
 * e caminhos que nada percorre são caminhos que ninguém verifica.
 *
 * Quando existir uma versão 2, a migração escreve-se em migrations.js e o
 * mecanismo já cá está.
 */
export const SCHEMA_VERSION = 1;
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
