import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";

export default [
    js.configs.recommended,
    {
        ignores: ["node_modules/**", "dist/**"],
    },
    {
        files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            "react-refresh": reactRefreshPlugin,
        },
        rules: {
            // TypeScript rules
            // "@typescript-eslint/no-unused-vars": ["warn", {argsIgnorePattern: "^_"}],
            "@typescript-eslint/no-explicit-any": "warn",
            // "@typescript-eslint/prefer-const": "error",
            "@typescript-eslint/no-non-null-assertion": "warn",

            // React rules
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react/jsx-uses-react": "off",
            "react/jsx-uses-vars": "error",
            "react/jsx-key": "error",
            "react/jsx-no-target-blank": "error",

            // React Hooks rules
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // React Refresh
            "react-refresh/only-export-components": ["warn", {allowConstantExport: true}],

            // General rules
            "semi": "error",
            "eqeqeq": "warn",
            "no-console": "warn",
            "no-debugger": "error",
            "prefer-const": "error",
            "no-var": "error",
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];
