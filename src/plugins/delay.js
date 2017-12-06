/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const { progressTimer } = require( '../util/progress-helpers' );
const { delay, proxy } = require( '../util/async-helpers' );
const { CANCEL } = require( '../notification-types' );
const { SKIPPED } = require( '../outcomes' );

module.exports = {
   pre( context, item ) {
      return Promise.resolve({
         description: `wait ${item.milliseconds || item[ ':milliseconds' ] || 1000}ms`,
         context,
         ...item
      });
   },

   runProps: () => ({
      milliseconds: 1000
   }),

   run( item, runner ) {
      const { milliseconds } = item;
      const jobState = runner.jobState();
      const progressReporter = progressTimer( jobState, item, { durationMs: milliseconds } );

      const cancelableResult = proxy(
         delay( milliseconds ).then( () => {
            progressReporter.stop();
            return { message: `waited for ${milliseconds}ms` };
         } )
      );

      jobState.subscribe( CANCEL, () => {
         progressReporter.stop();
         cancelableResult.resolve( { outcome: SKIPPED } );
      } );

      return cancelableResult.promise;
   }
};
