const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  watch: true,
  entry: './src/index.ts',
  target: 'web',
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
    fallback: {
      "fs": false,
      "tls": false,
      "net": false,
      "util": false,
      "path": false,
      "zlib": false,
      "http": false,
      "https": false,
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer"),
      "crypto": false,
    }
  },
  devtool: 'source-map',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
      new CopyWebpackPlugin({
        patterns: [{
          from: './node_modules/canvaskit-wasm/bin/canvaskit.wasm'
        }]
      }),
      new HtmlWebpackPlugin({
        title: 'Output Management',
      })
  ]
};