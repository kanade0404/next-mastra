import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginFp from 'eslint-plugin-fp';
import pluginImport from 'eslint-plugin-import';
import pluginSecurity from 'eslint-plugin-security';
import pluginNext from '@next/eslint-plugin-next';
import pluginPrettier from 'eslint-plugin-prettier';

export default [
    {
        ignores: [
            'node_modules/**',
            '.next/**',
            'out/**',
            'public/**',
            'coverage/**',
            '.turbo/**',
            'dist/**',
            'build/**',
            '.claude/*.local.json',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    pluginSecurity.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        ignores: [
            '*.config.js',
            '*.config.mjs',
            '*.config.ts',
            '.prettierrc.js',
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            react: pluginReact,
            'react-hooks': pluginReactHooks,
            fp: pluginFp,
            import: pluginImport,
            security: pluginSecurity,
            '@next/next': pluginNext,
            prettier: pluginPrettier,
        },
        rules: {
            // 基本的なルール
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',

            // 関数型プログラミングルール
            'fp/no-mutation': 'error',
            'fp/no-let': 'error',
            'fp/no-loops': 'error',
            'fp/no-mutating-methods': 'error',

            // TypeScriptの基本ルール
            '@typescript-eslint/explicit-function-return-type': 'off', // TypeScriptファイル専用で設定
            '@typescript-eslint/explicit-module-boundary-types': 'off', // TypeScriptファイル専用で設定

            // import整理ルール
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
            'import/newline-after-import': 'error',
            'import/no-duplicates': 'error',

            // React関連
            'react/react-in-jsx-scope': 'off', // Next.js 13+では不要
            'react/jsx-uses-react': 'off', // Next.js 13+では不要
            'react/prop-types': 'off', // TypeScriptを使用しているため
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // Next.js関連
            '@next/next/no-img-element': 'error',
            '@next/next/no-page-custom-font': 'error',

            // セキュリティ関連
            'security/detect-object-injection': 'error',
            'security/detect-non-literal-regexp': 'error',
            'security/detect-unsafe-regex': 'error',

            // Prettierとの統合
            'prettier/prettier': 'error',
        },
        settings: {
            react: {
                version: 'detect',
            },
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                },
            },
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            // TypeScriptファイルでは明示的な関数戻り値型を必須
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
        },
    },
    {
        files: [
            'src/app/**/route.{ts,tsx}',
            'src/app/**/page.{ts,tsx}',
            'src/app/**/layout.{ts,tsx}',
        ],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off', // Next.jsルートでは戻り値型を緩く
            '@typescript-eslint/explicit-module-boundary-types': 'off',
        },
    },
    {
        files: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
        rules: {
            'no-console': 'off', // テストファイルではconsole.logを許可
            'fp/no-mutation': 'off', // テストファイルではミューテーションを許可
            '@typescript-eslint/explicit-function-return-type': 'off', // テストファイルでは戻り値型を緩く
            'security/detect-object-injection': 'off', // テストファイルではオブジェクトインジェクション警告を無効
        },
    },
];
