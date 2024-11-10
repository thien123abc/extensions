const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'production'
});

// webpack/webpack.prod.js hoặc webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './src/index.js', // Điểm vào của ứng dụng
  output: {
    path: path.resolve(__dirname, 'dist'), // Thư mục output
    filename: 'bundle.js', // Tên file bundle
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',  // Đảm bảo template HTML đúng
    }),
  ],
};
