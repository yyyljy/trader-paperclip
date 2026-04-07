import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.vite/**",
      "vitest.config.ts",
      "packages/db/**",
      "packages/fixtures/**"
    ]
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
      "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }]
    }
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/setupTests.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.vitest
      }
    }
  },
  {
    files: ["vitest.config.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false
      },
      globals: {
        ...globals.node
      }
    }
  }
);
