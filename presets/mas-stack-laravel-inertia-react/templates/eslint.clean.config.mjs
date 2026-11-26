// Front clean-code gate for laravel-inertia-react. Measure changed files only.
export default [
  {
    files: ["resources/js/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "sonarjs/cognitive-complexity": ["error", 15],
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-duplicated-branches": "error",
      "no-magic-numbers": ["error", { ignore: [0, 1, -1] }],
      "no-console": "error",
      "no-debugger": "error",
    },
  },
];
