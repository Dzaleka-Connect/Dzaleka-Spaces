import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  {
    rules: {
      // Dynamic keys are constrained by typed, hard-coded allowlists. This
      // heuristic otherwise reports every safe record lookup and chart map.
      "security/detect-object-injection": "off",
      // Migration/content scripts construct paths only beneath repository
      // roots; none of these paths comes from an HTTP request.
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
