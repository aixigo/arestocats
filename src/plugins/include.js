/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const { mergeContext } = require( '../util/item-helpers' );

module.exports = {

   preProps: () => ({ src: null, description: null }),

   pre( ancestorContext, { src, name, description }, loader ) {
      return loader.load( { ...ancestorContext, $loader: 'include' }, src )
         .then( ({ context, item }) => loader
            .pre( mergeContext( context, item ), item )
            .then( result => ({
               ...result,
               name: name || result.name,
               description: description || result.description
            }) ) );
   }

};
