/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {
   isEmpty,
   print,
   tabulate,
   zip
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function print( str ) {
   // eslint-disable-next-line
   console.log( `| ${str}`.split( '\n' ).join( '\n| ' ) );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function tabulate( f, keys, table = {} ) {
   keys.forEach( k => { table[ k ] = f( k ); } );
   return table;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function zip( acc, [ k, v ] ) {
   const res = acc;
   res[ k ] = v;
   return res;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isEmpty( obj ) {
   for( const p in obj ) {
      if( obj.hasOwnProperty( p ) ) {
         return false;
      }
   }
   return true;
}
