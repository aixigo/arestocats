/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const { print } = require( '../util/general-helpers' );

module.exports = {
   pre( context, item ) {
      const { name } = item;
      print( `PRE  debug ${name} context: ${JSON.stringify( context, null, 3 )}` );
      print( `PRE  debug ${name} item: ${JSON.stringify( item, null, 3 )}` );
      return Promise.resolve();
   },
   run( item ) {
      const { name } = item;
      print( `RUN  debug ${name}: ${JSON.stringify( item, null, 3 )}` );
      return Promise.resolve();
   }
};
