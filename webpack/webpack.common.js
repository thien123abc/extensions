const webpack = require("webpack");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const srcDir = path.join(__dirname, "..", "src");

module.exports = {
    entry: {
        server_worker: path.join(srcDir, 'server_worker.ts'),
        content_script: path.join(srcDir, 'content_script.ts'),
    },
    output: {
        path: path.join(__dirname, "../build"),
        filename: "js/[name].js",
    },
    optimization: {
        splitChunks: {
            name: "vendor",
            chunks(chunk) {
                return chunk.name !== 'background';
            }
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.(css|scss)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader'
                ],
                exclude: /node_modules/,
            },
            {
                test: /\.svg$/, // Thêm rule xử lý file SVG
                use: [
                    {
                        loader: 'url-loader', // Hoặc 'file-loader' tùy thuộc vào nhu cầu của bạn
                        options: {
                            limit: 8192, // Nếu file nhỏ hơn 8KB, nó sẽ được inline, nếu không sẽ tạo file
                        },
                    },
                ],
                exclude: /node_modules/,
            }
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js" ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'css/[name].css'
        }),
    ],
};
