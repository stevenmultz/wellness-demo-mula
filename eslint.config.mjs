import coreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...coreWebVitals,
  {
    // React-Compiler-era rules introduced with eslint-plugin-react-hooks v7 (Next 16 config).
    // They flag pre-existing effect patterns (performance/style, not correctness defects) and are
    // kept as warnings until those components are refactored with UI test coverage.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  { ignores: [".next/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
];

export default config;
