/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

export function durationLabel( durationMs ) {
   if( durationMs < 1000 ) {
      return `${Math.round( durationMs )}ms`;
   }
   if( durationMs < 1000 * 60 ) {
      return `${Math.round( durationMs / 1000 )}s`;
   }
   return `${Math.round( durationMs / (1000 * 60) )}min`;
}
