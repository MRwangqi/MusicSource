const path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    entry: './src/music.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].min.js'
    },
    plugins: [
        new CleanWebpackPlugin(),
        new NodePolyfillPlugin()
    ],
    optimization: {
        minimize: false,
    }
}