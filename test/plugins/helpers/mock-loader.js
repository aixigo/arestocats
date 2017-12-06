/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = createMockLoader;

const { mergeContext, extractProps } = require( '../../../src/util/item-helpers' );

function createMockLoader( plugin, type = 'testPlugin' ) {
   const mock = {
      pre( context, item ) {
         return Promise.resolve( { context, ...item } );
      }
   };

   return {
      pre: ( context, item ) => {
         const itemContext = mergeContext( context, item );
         const namedItem = { name: 'testItem', $id: 1, type, ...item };
         const propsItem = {
            ...namedItem,
            ...extractProps( namedItem, plugin.preProps( namedItem ), {} )
         };

         return plugin.pre( itemContext, propsItem, mock )
            .then( result => result || { context, ...propsItem } );
      },
      mock
   };
}
