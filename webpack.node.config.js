const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  watch: false,
  entry: './src/node.ts',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: 'source-map',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'scripts'),
  },
  plugins: [
      new CopyWebpackPlugin({
        patterns: [
            {from: './node_modules/canvaskit-wasm/bin/profiling/canvaskit.wasm'},
        ]
      })
  ]
};