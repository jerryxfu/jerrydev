import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";

export default [
    {
        ignores: ["node_modules/**", "dist/**"],
    },
    {
        files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
            parser: tsParser,
        },
        plugins: {
            react: reactPlugin,
        },
        rules: {
            "semi": "error",
            "no-unused-vars": "warn",
            "eqeqeq": "warn",
            "react/react-in-jsx-scope": "off",
        },
    },
];
