/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * Loads and prepares test items in a batch fashion.
 *
 * @module cli
 */

/* global fetch */
require( 'isomorphic-fetch' );

const createLoader = require( './loader' );
const createRunner = require( './runner' );

const { delay } = require( '../util/async-helpers' );
const { print } = require( '../util/general-helpers' );
const { SUCCESS, worstOf } = require( '../outcomes' );
const { resultTrees } = require( '../util/result-helpers' );
const { URL } = require('url');

module.exports = function( state, options = {} ) {
   const { reporters = [ 'stdout' ], wait = 0, scenarios, remote = null } = options;

   return {
      run( context ) {
         return delay( wait * 1000 ).then( () =>
            runScenarios( context, scenarios, collectReporters( reporters ) )
         );
      }
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function runScenarios( context, scenarioList, reporterList ) {
      const loader = createLoader();
      return loader.loadScenarios( context, scenarioList )
         .then( rootItems => {
            return remote ?
               runRemotely( rootItems ) :
               runLocally( rootItems );
         } );

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function runLocally( rootItems ) {
         const run = createRunner();
         const job = state.createJob( rootItems );
         return run( job )
            .then( success => {
               const allResultTrees = resultTrees( job.items(), job.results() );
               reporterList.forEach( report => {
                  report( allResultTrees, job.items(), job.results() );
               } );
               return success;
            } );
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function runRemotely( rootItems ) {
         return fetch( remote )
            .then( _ => _.json() )
            .then( entry => entry._links.jobs.href )
            .then( jobsHref => {
               const headers = { 'Content-Type': 'application/json' };
               const body = JSON.stringify( rootItems );
               return fetch( absUrl( jobsHref ), { method: 'POST', headers, body } );
            } )
            .then( follower() )
            .then( follower( 'results' ) )
            .then( _ => _.json() )
            .then( results => {
               const allResultTrees = resultTrees( rootItems, results );
               reporterList.forEach( report => {
                  report( allResultTrees, rootItems, results );
               } );
               return worstOf( results.map( _ => _.outcome ) ) === SUCCESS;
            } );

         function follower( relation ) {
            return response => {
               const urlPromise = relation ?
                  response.json().then( _ => _._links[ relation ].href ) :
                  Promise.resolve( response.headers.get( 'location' ) );
               const headers = { accept: 'application/json' };
               return urlPromise
                  .then( absUrl )
                  .then( _ => fetch( _, { headers } ) );
            };
         }
      }

      function absUrl( path ) {
         return new URL( path, remote ).href;
      }
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////


   function collectReporters( reporterNames ) {
      const availableReporters = {
         csv: require( '../reporters/csv' ),
         html: require( '../reporters/html' ),
         stdout: require( '../reporters/stdout' )
      };
      return reporterNames.map( name => {
         if( !availableReporters[ name ] ) {
            print( `Reporter ${name} is not available. Why don't you implement it?` );
            print( `Available are: ${Object.keys( availableReporters ).join( ', ' )}. Exiting.` );
            process.exit( 1 );
         }
         return availableReporters[ name ];
      } );
   }

};
