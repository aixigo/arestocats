/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * Loads and selects plugins to preprocess and run items.
 *
 * @module plugin-loader
 */

module.exports = createPluginLoader;

const fs = require( 'fs' );
const path = require( 'path' );

const { zip } = require( '../util/general-helpers' );
const { itemError } = require( '../util/item-helpers' );

const defaultPluginsPath = path.resolve( __dirname, '../plugins/' );

///////////////////////////////////////////////////////////////////////////////////////////////////////////

function createPluginLoader( pluginsPath = defaultPluginsPath, userPlugins = {} ) {

   const suffixPattern = /[.](js|json)$/;

   const fsPluginModules = fs.readdirSync( pluginsPath )
      .map( name => [ name, path.join( pluginsPath, name ) ] )
      .filter( name => suffixPattern.test( name ) )
      .filter( ([ , ref ]) => fs.statSync( ref ).isFile() )
      .map( ([ name, ref ]) => [ name.replace( suffixPattern, '' ), require( ref ) ] );

   const userPluginModules = Object.keys( userPlugins )
      .map( name => [ name, userPlugins[ name ] ] );

   const plugins = [ ...fsPluginModules, ...userPluginModules ]
      .map( ([ name, mod ]) => [ name, mod ] )
      .reduce( zip, {} );

   return {
      select( context, item ) {
         if( !item ) {
            throw itemError( 'no item!', context, item );
         }
         if( !item.type ) {
            throw itemError( 'item needs "type"', context, item );
         }
         const plugin = plugins[ item.type ];
         if( !plugin ) {
            throw itemError( `unknown item type "${item.type}"`, context, item );
         }
         return plugin;
      }
   };
}
