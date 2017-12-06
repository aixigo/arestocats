/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = { progressTimer };

const { PROGRESS } = require( '../notification-types' );

function progressTimer( jobState, item, { durationMs = 0, probe = () => 0, reportMs = 250 } ) {
   let progressMs = 0;
   let done = false;
   const reportInterval = setInterval( update, reportMs );

   return {
      update,
      stop() {
         done = true;
         clearInterval( reportInterval );
      }
   };

   function update() {
      if( done ) {
         clearInterval( reportInterval );
         return;
      }
      progressMs += reportMs;
      const workProgress = probe();
      const timeProgress = durationMs <= 0 ? 0 : Math.min( progressMs / durationMs, 1 );
      report( Math.max( workProgress, timeProgress ) );
   }

   function report( progress ) {
      jobState.notify( PROGRESS, { $id: item.$id, progress } );
   }
}
