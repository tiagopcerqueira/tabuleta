import globals from "globals";

/**
 * Regras deliberadamente exigentes nos pontos que já produziram bugs reais:
 * - no-implicit-coercion / restricted-syntax contra String(objeto), que foi
 *   exatamente o defeito que corrompia as sobremesas na importação (D1).
 * - no-empty sem allowEmptyCatch: os catch vazios escondiam falhas de gravação (D2).
 */
export default [
  {
    ignores: ["assets/html2canvas.min.js", "node_modules/", "docs/"],
  },

  // Código do browser (a app propriamente dita)
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-implicit-globals": "error",
      "no-throw-literal": "error",
      curly: ["error", "multi-line"],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='String'][arguments.0.type='ObjectExpression']",
          message: "String() sobre um objeto produz '[object Object]' — normaliza o objeto explicitamente.",
        },
      ],
    },
  },

  // Service worker
  {
    files: ["sw.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.serviceworker },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },

  // Ferramentas e testes (Node)
  {
    files: ["tools/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
