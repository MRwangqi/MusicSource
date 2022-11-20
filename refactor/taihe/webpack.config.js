const path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
    entry: './src/music.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].min.js'
    },
    plugins: [
        new CleanWebpackPlugin(),
        new NodePolyfillPlugin(),
        new UglifyJsPlugin({
            uglifyOptions: {
                //生产环境自动删除 console
                compress: {
                    drop_debugger: true,
                    drop_console: true,
                    pure_funcs: ['console.log']
                }
            },
            chunkFilter: (chunk) => {
                // `search` 块不压缩
                if (chunk.name === 'search') {
                    return false;
                }
                return true;
            },
            sourceMap: false,
            parallel: true,
        })
    ],
    optimization: {
        minimize: true,
    }
}