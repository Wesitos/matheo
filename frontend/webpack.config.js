const path = require('path');
const glob = require('glob');
const autoprefixer = require('autoprefixer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const PurifyCSSPlugin = require('purifycss-webpack');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  entry: {
    index: './src/js/index.js',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'js/[name]-[hash].js',
    publicPath: '/',
  },
  devServer: {
    compress: true,
  },
  devtool: isProduction ? 'hidden-source-map' : 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpg|svg)$/,
        loader: 'file-loader',
        options: {
          name: 'img/[name]-[hash].[ext]',
        },
      },
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins() {
                  return [
                    autoprefixer,
                  ];
                },
              },
            },
            { loader: 'resolve-url-loader',
              options: { root: 'src' },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
              },
            },
          ],
        }),
      },
      {
        test: /\.html$/,
        use: {
          loader: 'html-loader',
          options: {
            interpolate: 'require',
            attrs: ['img:src', 'link:href'],
          },
        },
      },
      {
        test: /\.(ttf$|eot|woff2?)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'fonts/[name]-[hash].[ext]',
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      jquery: 'jquery/src/jquery',
    },
  },
  plugins: [
    new ExtractTextPlugin('css/[name].css'),
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new PurifyCSSPlugin({
      paths: [].concat(
        glob.sync(path.join(__dirname, 'src/**/*.?(html|js)')),
        glob.sync(path.join(__dirname, 'node_modules/materialize-css/js/**/*.js'))
      ),
      minimize: isProduction,
      styleExtensions: ['.css'],
    }),
    // Add contenthash to the css files
    {
      apply(compiler) {
        compiler.plugin('this-compilation', (compilation) => {
          compilation.plugin('additional-assets', (cb) => {
            const {assets} = compilation;
            const originalAssetsToRename = Object.keys(assets).map(
              name => path.extname(
                name.indexOf('?') >= 0 ?
                  name.split('?').slice(0, -1).join('') :
                  name) === '.css' && { name, asset: assets[name] });
            compilation.chunks.forEach(
              (chunk) => {
                const {name: chunkName, files, modules} = chunk;
                const assetsToRename = originalAssetsToRename.filter(
                  asset => asset && files.indexOf(asset.name) >= 0);

                assetsToRename.forEach(({name, asset}) => {
                  const fileIdx = files.indexOf(name);
                  // Create new asset path // HARDCODED FORMAT!!!
                  const newPath = compilation.getPath(
                    'css/[name]-[hash].css', {chunk});
                  // Replace asset reference in chunk
                  files[fileIdx] = newPath;
                  // Add new asset
                  assets[newPath] = asset;
                });
              });
            // Delete original assets
            originalAssetsToRename.forEach(({name}) => {
              delete assets[name];
            });
            cb();
          });
        });
      }
    },
    new webpack.DefinePlugin({
      'process.env': serverlessEnv,
    }),
  ],
};

// Production plugins
if (isProduction) {
  config.plugins = config.plugins.concat(
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    new webpack.DefinePlugin({
      'process.env': {
          NODE_ENV: JSON.stringify('production'),
        }
      }),
    new webpack.optimize.UglifyJsPlugin({
      beautify: false,
      mangle: {
        screw_ie8: true,
        keep_fnames: true,
      },
      compress: {
        warnings: true,
      },
      comments: false,
    })
  );
}


module.exports = config;
