import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import stylisticTs from "@stylistic/eslint-plugin-ts"

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@stylistic/ts": stylisticTs
    }
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@stylistic/ts/comma-dangle": ["error", "never"],
      "@stylistic/ts/comma-spacing": [
        "error",
        {
          before: false,
          after: true
        }
      ],
      "@stylistic/ts/space-before-function-paren": [
        "error",
        {
          anonymous: "never",
          named: "never",
          asyncArrow: "always"
        }
      ],
      "@stylistic/ts/quotes": ["error", "double", { avoidEscape: true }],
      semi: "off",
      "@stylistic/ts/semi": ["error", "never"],
      "@stylistic/ts/member-delimiter-style": [
        "error",
        {
          multiline: { delimiter: "none" },
          singleline: { delimiter: "semi" }
        }
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" }
      ],
      "@typescript-eslint/prefer-for-of": "error",
      eqeqeq: "error",
      "@typescript-eslint/no-explicit-any": ["warn", { ignoreRestArgs: true }]
    }
  }
]
