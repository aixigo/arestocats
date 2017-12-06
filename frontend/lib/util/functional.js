/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

export function zip( acc, [ k, v ] ) {
   acc[ k ] = v;
   return acc;
}

export function isEmpty( object ) {
   for( const k in object ) {
      if( object.hasOwnProperty( k ) ) {
         return false;
      }
   }
   return true;
}

export function collectIndex( acc, i ) {
   acc[ i ] = true;
   return acc;
}
