/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * Runs test items, producing results.
 *
 * @module runner
 */

const path = require( 'path' );

const { SUCCESS, ERROR, SKIPPED, worstOf } = require( '../outcomes' );
const { CANCEL, RESULT, META } = require( '../notification-types' );
const { interpret, extractProps } = require( '../util/item-helpers' );
const { itemError } = require( '../util/item-helpers' );
const { sequence } = require( '../util/async-helpers' );
const createPluginLoader = require( './plugin-loader' );

module.exports = (options = {}) => {
   const plugins = createPluginLoader( options.pluginsPath, options.userPlugins );
   return jobState => runJob( jobState, plugins );
};

function runJob( jobState, plugins ) {
   const $results = {};
   let cancelled = false;
   const self = {
      run( item ) {
         const handler = typeHandler( item.context, item );
         return handler( cancelled );
      },
      skip( item ) {
         const handler = typeHandler( item.context, item );
         return handler( true );
      },
      prop: ( item, name, fallback = null ) =>
         extractProps( item, { [ name ]: fallback }, { ...item.context, $results } )[ name ],
      interpret: ( context, expression ) =>
         expression && interpret( expression, { ...context, $results } ),
      jobState: () => jobState
   };

   const scenarios = jobState.items();
   const processActions = scenarios
      .map( item => acc => self.run( item ).then( res => acc.concat( res ) ) );

   jobState.subscribe( CANCEL, () => {
      cancelled = true;
   } );

   return sequence( processActions, [] )
      .then( results => {
         const outcome = worstOf( results.map( _ => _.outcome ) );
         jobState.notify( META, { outcome, finished: new Date().toISOString() } );
         return outcome === SUCCESS;
      } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function typeHandler( context, item ) {
      const id = _ => _;
      const noOp = () => Promise.resolve();
      const { runProps = id, run = noOp, skip = noOp } = plugins.select( context, item );

      return ( doSkip = false ) => {
         if( !item.context ) {
            throw itemError( `missing context, invalid preprocessor (type: ${item.type})`, {}, item );
         }
         const measurement = measure();
         return Promise.resolve( item )
            .then( it => doSkip ?
               runProps( it ) :
               extractProps( it, runProps( it ), { ...it.context, $results } )
            )
            .then( it => ( doSkip || it.enabled === false ) ? skip( it, self ) : run( it, self ) )
            .catch( error => ({ outcome: ERROR, errors: [ error ] }) )
            .then( result => ({
               ...baseResult( item, doSkip ? SKIPPED : SUCCESS, measurement ),
               ...result
            }) )
            .then( result => {
               $results[ item.name ] = result;
               jobState.notify( RESULT, result );
               return result;
            } );
      };
   }

}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

function baseResult( item, outcome, measurement ) {
   // keep some basic item properties in the subject, for identification
   const { $id, name, description, type } = item;
   const sourceFile = item.context.$fileName.split( path.sep ).slice( -3 ).join( path.sep );
   const role = item.context.role || 'test';
   const subject = { $id, name, description, role, sourceFile, type };

   return {
      subject,
      outcome,
      startTime: measurement.startTime,
      durationMs: measurement.ms(),
      failures: [],
      errors: [],
      message: outcome.toLowerCase()
   };
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////

function measure() {
   const startTime = new Date().toISOString();
   const [ startS, startNs ] = process.hrtime();
   return {
      startTime,
      ms() {
         const [ endS, endNs ] = process.hrtime();
         const deltaS = endS - startS;
         const deltaNs = endNs - startNs;
         const deltaMs = ( deltaS * 1000 ) + ( deltaNs / (1000 * 1000) );
         return deltaMs;
      }
   };
}
