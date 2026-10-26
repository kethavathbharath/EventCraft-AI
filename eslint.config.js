import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                claude: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                URL: "readonly",
                Intl: "readonly",
                Date: "readonly",
                Math: "readonly",
                JSON: "readonly",
                Number: "readonly",
                String: "readonly",
                Array: "readonly",
                Object: "readonly",
                Promise: "readonly",
                Error: "readonly",
            },
        },
        rules: {
            /** Possible errors */
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-debugger": "error",
            "no-duplicate-imports": "error",

            /** Best practices */
            "curly": ["error", "all"],
            "eqeqeq": ["error", "always"],
            "no-eval": "error",
            "no-implied-eval": "error",
            "no-var": "error",
            "prefer-const": "error",
            "prefer-template": "warn",

            /** Style */
            "camelcase": ["warn", { properties: "never" }],
            "max-len": ["warn", { code: 120, ignoreComments: true, ignoreStrings: true }],
            "max-lines-per-function": ["warn", { max: 60, skipComments: true }],
        },
    },
];
