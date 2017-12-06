/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/* env node */
const path = require( 'path' );
const webpack = require( 'webpack' );
const ExtractTextPlugin = require( 'extract-text-webpack-plugin' );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = ( env = {} ) => {

   const outputPath = `${env.production ? 'dist' : 'build'}${env.static ? '-static' : ''}/`;

   return {
      devtool: '#source-map',
      entry: {
         'init': env.static ? './init-static.js' : './init.js'
      },

      output: {
         path: path.resolve( __dirname, outputPath ),
         publicPath: outputPath,
         filename: env.production ? '[name].bundle.min.js' : '[name].bundle.js'
      },

      plugins: [
         ...( env.production ?
            [ new ExtractTextPlugin( { filename: '[name].bundle.css' } ) ] :
            [] ),
         new webpack.optimize.ModuleConcatenationPlugin()
      ],

      resolve: {
         modules: [ path.resolve( __dirname, 'node_modules' ) ],
         extensions: [ '.js', '.vue' ],
         alias: {
            'lib': path.resolve( __dirname, 'lib' ),
            'default.theme': 'laxar-uikit/themes/default.theme',
            'cube.theme': 'laxar-cube.theme'
         }
      },

      module: {
         rules: [
            {
               test: /.js$/,
               exclude: /node_modules/,
               loader: 'babel-loader'
            },
            {
               test: /.spec.js$/,
               exclude: /node_modules/,
               loader: 'laxar-mocks/spec-loader'
            },
            {
               // load styles, images and fonts with the file-loader
               // (out-of-bundle in build/assets/)
               test: /\.(gif|jpe?g|png|ttf|woff2?|svg|eot|otf)(\?.*)?$/,
               loader: 'file-loader',
               options: {
                  name: env.production ? 'assets/[name]-[sha1:hash:8].[ext]' : 'assets/[path]-[name].[ext]'
               }
            },
            {
               // ... and resolving CSS url()s with the css loader
               // (extract-loader extracts the CSS string from the JS module returned by the css-loader)
               test: /\.(css|s[ac]ss)$/,
               loader: env.production ?
                  ExtractTextPlugin.extract( {
                     fallback: 'style-loader',
                     use: 'css-loader',
                     publicPath: ''
                  } ) :
                  'style-loader!css-loader?sourceMap'
            },
            {
               test: /[/]default[.]theme[/].*[.]s[ac]ss$/,
               loader: 'sass-loader',
               options: require( 'laxar-uikit/themes/default.theme/sass-options' )
            },
            {
               test: /[/](laxar-)?cube[.]theme[/].*[.]s[ac]ss$/,
               loader: 'sass-loader',
               options: require( 'laxar-cube.theme/sass-options' )
            },
            {
               test: /.vue$/,
               loader: 'vue-loader'
            }
         ]
      }
   };

};
