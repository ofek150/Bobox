module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off"
  },
  overrides: [
    {
      // shadcn/ui components export their Props types and cva variants
      // alongside the component - the stock pattern, not a fast-refresh bug.
      files: ['src/components/ui/**/*.{ts,tsx}'],
      rules: { 'react-refresh/only-export-components': 'off' }
    },
    {
      // Context modules export the hook/context next to the provider -
      // the standard React context pattern.
      files: ['src/contexts/**/*.tsx'],
      rules: { 'react-refresh/only-export-components': 'off' }
    }
  ]
};
