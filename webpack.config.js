const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const CnameWebpackPlugin = require('cname-webpack-plugin');
const settings = require('./settings');
const CopyPlugin = require("copy-webpack-plugin");
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const entry = path.join(__dirname, './src/index.tsx');
const port = 8262;
const output = path.join(__dirname, './dist');
const publicPath = mode === 'production' ? settings.repoPath || '/' : '/';

module.exports = {

  mode,
  optimization: {
    minimizer: [new TerserJSPlugin({})],
    runtimeChunk: 'single',
  },

  devServer: {
    port,
    compress: true,
    contentBase: output,
    publicPath,
    stats: { colors: true },
    hot: true,
    historyApiFallback: true,
    open: true,
  },

  devtool: mode === 'production' ? false : 'eval',

  entry:
    mode === 'production'
      ? entry
      : [
          `webpack-dev-server/client?http://localhost:${port}`,
          'webpack/hot/only-dev-server',
          entry,
        ],

  output: {
    path: output,
    filename: '[name].js',
    publicPath,
  },

  resolve: {
    modules: [path.join(__dirname, './node_modules')],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },

  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        include: path.join(__dirname, './src'),
        use: 'ts-loader',
      },
      {
        test: /\.(svg|png|jpg|gif|woff|woff2|otf|ttf|eot)$/,
        type: 'asset/resource',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
      },
      {
        test: /node_modules\/https-proxy-agent\//,
        use: 'null-loader',
      },
    ],
  },

  plugins: [
    new CopyPlugin({
      patterns: [{ from: "404.html", to: "404.html" }],
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
      },
    }),
    new HtmlWebpackPlugin({
      favicon: path.join(__dirname, './favicon.png'),
      templateContent: ({ htmlWebpackPlugin }) => `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${settings.title}</title>
          </head>
          <body class="bg-gray-600">
            <noscript>
              Enable JavaScript to use Frontend toolbox
            </noscript>

            <div id="app"></div>
            ${htmlWebpackPlugin.tags.bodyTags}
          </body>
        </html>
      `,
    }),
    ...(mode !== 'production'
      ? [new webpack.HotModuleReplacementPlugin()]
      : [...(settings.cname ? [new CnameWebpackPlugin({ domain: settings.cname })] : [])]),
  ],
};
