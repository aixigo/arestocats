/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const { SUCCESS, FAILURE, ERROR, outcomes } = require( '../outcomes' );
const { PROGRESS } = require( '../notification-types' );
const { mergeContext } = require( '../util/item-helpers' );
const { progressTimer } = require( '../util/progress-helpers' );

// marker value indicating that no result has been produced yet
// TODO use a `range( results.length, items.length )` instead of side-effects?
const TBD = {};

module.exports = {
   preProps: () => ({
      items: []
   }),
   pre( context, item, loader ) {
      const parentContext = { ...context, $loader: 'suite' };
      return Promise.all( item.items.map( _ => {
         return loader.pre( mergeContext( parentContext, _ ), _ );
      } ) )
         .then( items => Promise.resolve( { ...item, context, items } ) );
   },
   run( item, runner ) {
      const { items, context } = item;

      let currentProgress = 0;
      const jobState = runner.jobState();
      const progressReporter = progressTimer( jobState, item, {
         probe: () => currentProgress
      } );

      jobState.subscribe( PROGRESS, ({ $id, progress }) => {
         items.forEach( (it, i) => {
            if( it.$id !== $id ) { return; }
            currentProgress = (i + progress) / items.length;
            progressReporter.update();
         } );
      } );

      const results = items.map( () => TBD );
      const actions = items.map( (t, i) => () => {
         return runner.run( t ).then( res => {
            results[ i ] = res;
            currentProgress = (i + 1) / items.length;
            progressReporter.update();
            return res;
         } );
      } );

      return sequence( actions, context.stopAfter )
         .then( () => {
            progressReporter.stop();
            const itemResults = results
               .map( ( _, i ) => _ === TBD ? runner.skip( items[ i ] ) : _ );
            return summaryResult( itemResults, () => runner.prop( item, 'export' ) );
         } );
   },
   skip( item, runner ) {
      const { items } = item;
      return items.map( runner.skip );
   }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * run a sequence of promise-generating functions (actions)
 * @param {...Function<Promise>} actions
 *   a list of promise-generating functions to be run in-order
 * @param {String} stopAfter
 *   if a sequence item has this outcome or worse, stop the suite
 * @return {Promise}
 *   a promise that will be fulfilled when all actions have been run in-order
 */
function sequence( actions, stopAfter = outcomes.ERROR ) {
   return actions.length ?
      actions[ 0 ]().then( result =>
         shouldCancel( result ) ?
            Promise.resolve() :
            sequence( actions.slice( 1 ), stopAfter )
      ) :
      Promise.resolve();

   function shouldCancel( { outcome } ) {
      return stopAfter && outcomes.indexOf( outcome ) >= outcomes.indexOf( stopAfter );
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function summaryResult( results, provideExport ) {
   const hasError = results.some( _ => _.outcome === ERROR );
   const isSuccess = !hasError && results.every( _ => _.outcome === SUCCESS );
   return Promise.resolve( {
      outcome: ( hasError && ERROR ) || ( isSuccess ? SUCCESS : FAILURE ),
      message: `${matching( SUCCESS ).length}/${results.length} successful`,
      export: hasError ? null : provideExport(),
      failures: matching( FAILURE )
         .map( ([ { name }, index ]) => `item ${index} (${name}) failed` ),
      errors: matching( ERROR )
         .map( ([ { name }, index ]) => `item ${index} (${name}) errored` )
   } );

   function matching( outcome ) {
      return results
         .map( (_, index) => [ _, index ] )
         .filter( ([ _ ]) => _.outcome === outcome );
   }
}
