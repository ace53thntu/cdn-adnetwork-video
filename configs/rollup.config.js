import path from "path";

import css from "rollup-plugin-import-css";
import external from "rollup-plugin-peer-deps-external";
import { sizeSnapshot } from "rollup-plugin-size-snapshot";
import { terser } from "rollup-plugin-terser";

import { babel } from "@rollup/plugin-babel";
import pluginCommonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import strip from "@rollup/plugin-strip";

import pkg from "../package.json";

const EXTENSIONS = [".js"];
const OUTPUT_FOLDER = "build";
const ROOT_FOLDER = process.cwd();
const OUTPUT = path.resolve(ROOT_FOLDER, OUTPUT_FOLDER);
const SRC = path.resolve(ROOT_FOLDER, `src`);

const isProduction = !process.env.ROLLUP_WATCH;
// const moduleName = pkg.name.replace(/^@.*\//, "");
const moduleName = "video-sdk-ima";
const author = pkg.author;
const banner = `
    /**
     * @license
     * author: ${author}
     * ${moduleName}.js v${pkg.version}
     * Released under the ${pkg.license} license.
     */
  `;

export default {
  input: "src/index.js",
  output: {
    file: `${OUTPUT_FOLDER}/${moduleName}.min.js`,
    format: "iife",
    name: moduleName,
    banner,
    plugins: isProduction ? [terser()] : [],
    extend: true,
  },
  plugins: [
    external(),
    nodeResolve({
      extensions: EXTENSIONS,
    }),
    css({
      minify: isProduction,
      output: `${moduleName}.min.css`,
    }),
    pluginCommonjs({
      extensions: EXTENSIONS,
      // include: 'node_modules/**',
    }),
    babel({
      extensions: EXTENSIONS,
      babelHelpers: "bundled",
      configFile: path.resolve(ROOT_FOLDER, ".babelrc.js"),
      exclude: "node_modules/**",
    }),

    isProduction &&
      strip({
        include: "**/*.(js)",
        functions: ["console.log", "assert.*", "debug", "alert"],
      }),

    sizeSnapshot(),
  ],
};
