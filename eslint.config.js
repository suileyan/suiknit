import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // 基本规则
            'no-console': 'off', // 暂时关闭，因为项目中有很多console语句
            'no-debugger': 'error',

            // TypeScript 特定规则
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_'
                }
            ],
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off', // 暂时关闭，因为项目中有很多any类型
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unused-expressions': 'error',

            // 导入相关
            '@typescript-eslint/no-var-requires': 'off',

            // 代码风格
            'quotes': [
                'error',
                'single'
            ],
            'semi': [
                'error',
                'always'
            ],
            'comma-dangle': [
                'error',
                'never'
            ],
            'object-curly-spacing': [
                'error',
                'always'
            ],
            'array-bracket-spacing': [
                'error',
                'never'
            ]
        }
    },
    {
        ignores: [
            'dist/',
            'node_modules/',
            '*.js'
        ]
    }
);