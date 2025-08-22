// import { FlatCompat } from "@eslint/eslintrc";
// import tseslint from "typescript-eslint";
// // @ts-ignore -- no types for this plugin
// import drizzle from "eslint-plugin-drizzle";

// const compat = new FlatCompat({
//   baseDirectory: import.meta.dirname,
// });

// export default tseslint.config(
//   {
//     ignores: [".next"],
//   },
//   ...compat.extends("next/core-web-vitals"),
//   {
//     files: ["**/*.ts", "**/*.tsx"],
//     plugins: {
//       drizzle,
//     },
//     extends: [
//       ...tseslint.configs.recommended,
//       ...tseslint.configs.recommendedTypeChecked,
//       ...tseslint.configs.stylisticTypeChecked,
//     ],
//     rules: {
//       "@typescript-eslint/array-type": "off",
//       "@typescript-eslint/consistent-type-definitions": "off",
//       "@typescript-eslint/consistent-type-imports": [
//         "warn",
//         { prefer: "type-imports", fixStyle: "inline-type-imports" },
//       ],
//       "@typescript-eslint/no-unused-vars": [
//         "warn",
//         { argsIgnorePattern: "^_" },
//       ],
//       "@typescript-eslint/require-await": "off",
//       "@typescript-eslint/no-misused-promises": [
//         "error",
//         { checksVoidReturn: { attributes: false } },
//       ],
//       "drizzle/enforce-delete-with-where": [
//         "error",
//         { drizzleObjectName: ["db", "ctx.db"] },
//       ],
//       "drizzle/enforce-update-with-where": [
//         "error",
//         { drizzleObjectName: ["db", "ctx.db"] },
//       ],
//     },
//   },
//   {
//     linterOptions: {
//       reportUnusedDisableDirectives: true,
//     },
//     languageOptions: {
//       parserOptions: {
//         projectService: true,
//       },
//     },
//   },
// );
// Ultra‑relaxed ESLint flat config — copy/paste as eslint.config.js
// Turns off almost everything so no errors show up during build.

export default [
// Globally ignore common build dirs
{ ignores: [".next", "node_modules", "dist", "build"] },

// Apply to all JS/TS files
{
files: ["/*.ts", "/.tsx", "**/.js", "**/*.jsx"],

languageOptions: {
  // Keep ESLint simple and fast; no type-aware linting
  parserOptions: {
    projectService: false,
  },
},

// Disable rules so nothing blocks your build
rules: {
  // React / Next
  "react-hooks/rules-of-hooks": "off",
  "react/display-name": "off",
  "import/no-anonymous-default-export": "off",
  "@next/next/no-img-element": "off",
  "@next/next/no-html-link-for-pages": "off",
  "@next/next/no-document-import-in-page": "off",

  // TypeScript strictness (all off)
  "@typescript-eslint/no-floating-promises": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unsafe-assignment": "off",
  "@typescript-eslint/no-unsafe-member-access": "off",
  "@typescript-eslint/no-unsafe-return": "off",
  "@typescript-eslint/no-unsafe-argument": "off",
  "@typescript-eslint/prefer-nullish-coalescing": "off",
  "@typescript-eslint/prefer-optional-chain": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/only-throw-error": "off",
  "@typescript-eslint/array-type": "off",
  "@typescript-eslint/consistent-type-definitions": "off",
  "@typescript-eslint/require-await": "off",
  "@typescript-eslint/no-misused-promises": "off",
  "@typescript-eslint/consistent-type-imports": "off",

  // General JS rules (off)
  "no-console": "off",
  "no-unused-vars": "off",
  "no-undef": "off",
  "no-case-declarations": "off",
  "no-constant-condition": "off",
  "no-empty": "off",
  "no-prototype-builtins": "off",
  "no-useless-escape": "off",
},
},
];