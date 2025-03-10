import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { babel } from "@rollup/plugin-babel";
import livereload from "rollup-plugin-livereload";
import { terser } from "rollup-plugin-terser";
import css from "rollup-plugin-css-only";

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "frontend-src/main.js",
  output: {
    sourcemap: true,
    format: "iife",
    name: "app",
    file: "public/bundle.js",
  },
  plugins: [
    svelte({
      compilerOptions: {
        dev: !production,
      },
    }),
    css({ output: "bundle.css" }),
    babel({
      extensions: [".js", ".mjs", ".svelte"],
      babelHelpers: "runtime",
      include: ["src/**", "node_modules/svelte/**"],
    }),
    resolve({
      browser: true,
      dedupe: ["svelte"],
    }),
    commonjs(),
    !production && livereload("public"),
    production && terser(),
  ].filter(Boolean),
  watch: {
    clearScreen: false,
  },
};
