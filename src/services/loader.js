/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * Loads and prepares test items.
 *
 * @module runner
 */

const path = require( 'path' );
const { itemError, mergeContext, extractProps } = require( '../util/item-helpers' );
const createPluginLoader = require( './plugin-loader' );

function requireResolvePromise( request ) {
   return new Promise( (resolve, reject) => {
      try {
         const absPath = require.resolve( request );
         resolve( absPath );
      }
      catch( e ) {
         reject( e );
      }
   } );
}

const SKIP = {};

module.exports = (options = {}) => {

   let itemIndex = 0;
   const plugins = createPluginLoader( options.pluginsPath, options.userPlugins );
   const self = {
      loadScenarios( context, requests ) {
         const loadPromises = requests
            .map( _ => self.load( context, _ ).catch( () => SKIP ) );
         const preprocessPromises = loadPromises
            .map( _ => _.then( root => root === SKIP ? SKIP : self.pre( root.context, root.item ) ) );
         return Promise.all( preprocessPromises )
            .then( _ => _.filter( it => it !== SKIP ) );
      },
      load( context, relativeRequest ) {
         const absRequest = path.resolve( context.$baseDir || process.cwd(), relativeRequest );
         return requireResolvePromise( absRequest )
            .then( $fileName => {
               const $baseDir = path.dirname( $fileName );
               const item = require( absRequest );
               return {
                  context: { ...context, $baseDir, $fileName },
                  item
               };
            } );
      },
      pre( context, item ) {
         const itemContext = mergeContext( context, item );
         const handler = typeHandler( itemContext, item );
         const preprocessed = handler();
         return preprocessed;
      }
   };
   return self;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function typeHandler( context, item ) {
      const id = _ => _;
      const noOp = () => Promise.resolve();
      const { preProps = id, pre = noOp } = plugins.select( context, item );

      return () => {
         if( item.context ) {
            throw itemError( 'items cannot set "context". Use "defaults" or "overrides"', context, item );
         }
         const namedItem = ensureNamed( item );
         const propsItem = {
            ...namedItem,
            ...extractProps( namedItem, preProps( namedItem ), {} )
         };
         return pre( context, propsItem, self )
            .then( result => result || { context, ...propsItem } );
      };
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function ensureNamed( item ) {
      const id = ++itemIndex;
      const name = `$${item.type}-${id}`;
      return { name, ...item, $id: id };
   }

};
