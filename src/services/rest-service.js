/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * Provides a REST interface to load and run tests.
 *
 * @module rest
 */

const express = require( 'express' );
const serveStatic = require( 'serve-static' );
const bodyParser = require( 'body-parser' );
const path = require( 'path' );
const proxy = require( 'http-proxy-middleware' );

/* global fetch */
require( 'isomorphic-fetch' );

const pkg = require( '../../package.json' );
const { print } = require( '../util/general-helpers' );
const { recordStreamWriter, HEADERS, CONTENT_TYPES } = require( '../util/http-helpers' );
const { outcomes } = require( '../outcomes' );
const { RESULT, PROGRESS, META, METRIC } = require( '../notification-types' );
const createLoader = require( './loader' );
const createRunner = require( './runner' );

module.exports = function( state, options = {} ) {
   const {
      port = 3000,
      developmentProxy = false,
      developmentProxyTargetPort = 8080,
      scenarios,
      systemUnderTestVersionUrl
   } = options;

   const app = express();
   return {
      start( context ) {
         app.use( bodyParser.json( { limit: '10mb' } ) );
         configureResourceHandlers( context, '/api' );
         const staticRoot = resolvePackagePath( 'frontend' );
         app.use( serveStatic( staticRoot ) );
         if( developmentProxy ) {
            app.use( proxy( '/dev', {
               target: `http://localhost:${developmentProxyTargetPort}`,
               changeOrigin: true,
               pathRewrite: { '^/dev': '/' }
            } ) );
         }
         app.listen( port );
      }
   };

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function configureResourceHandlers( context, rootHref ) {

      const hrefs = routes( rootHref );
      handleResource( hrefs.entry(), getEntry );

      handleResource( hrefs.version(), { name: pkg.name, version: pkg.version } );
      handleResource( hrefs.context(), { ...context } );
      handleResource( hrefs.sutVersion(), getSutVersion );
      handleResource( hrefs.scenarios.list(), getScenarios );
      loadScenarios( context )
         .then( items => {
            items.forEach( _ => { handleResource( hrefs.scenarios.scenario( _ ), _ ); } );
         } );

      handleResource( hrefs.jobs.list(), getJobs );
      app.post( hrefs.jobs.create(), createJob );
      handleResource( hrefs.jobs.jobPattern(), getJob );
      handleResource( hrefs.jobs.itemsPattern(), getJobItems );
      app.get( hrefs.jobs.resultsPattern(), getJobResults );
      app.get( hrefs.jobs.metricsPattern(), getJobMetrics );
      app.get( hrefs.jobs.progressPattern(), getJobProgress );
      app.post( hrefs.jobs.cancelPattern(), cancelJob );

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function getEntry() {
         return {
            _links: {
               'version': { href: hrefs.version() },
               'system-under-test-version': { href: hrefs.sutVersion() },
               'context': { href: hrefs.context() },
               'scenarios': { href: hrefs.scenarios.listForContextTemplate(), templated: true },
               'jobs': { href: hrefs.jobs.list() }
            },
            description: 'REST integration tester'
         };
      }

      function getScenarios( req ) {
         return loadScenarios( { ...context, ...JSON.parse( req.query.context || '{}' ) } )
            .then( items => ({
               _links: {
                  item: items.map( _ => ({ href: hrefs.scenarios.scenario( _ ) }) )
               },
               _embedded: {
                  item: items.map( _ => ({
                     _links: { self: { href: hrefs.scenarios.scenario( _ ) } },
                     ..._
                  }) )
               }
            }) );
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function getSutVersion() {
         return systemUnderTestVersionUrl ?
            fetch( systemUnderTestVersionUrl ).then( response => response.json() ) :
            Promise.resolve( { baseArtifactVersion: null } );
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function createJob( request, response ) {
         const runner = createRunner( {} );
         try {
            const job = state.createJob( request.body );
            runner( job );
            response.writeHead( 201, {
               [ HEADERS.LOCATION ]: hrefs.jobs.job( job )
            } );
         }
         catch( e ) {
            // job in progress
            response.writeHead( 409 );
         }
         response.end();
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function cancelJob( request, response ) {
         const job = matchingJob( request.params.id );
         if( !job ) {
            send404( response );
            return;
         }

         response.writeHead( 200, { [ HEADERS.CONTENT_TYPE ]: CONTENT_TYPES.JSON } );
         job.cancel().then( () => {
            response.write( JSON.stringify( job.meta() ) );
            response.end();
         } );
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function getJobs() {
         const jobs = state.mostRecentJobs( 10 );
         return {
            _links: {
               job: jobs.map( _ => ({ href: hrefs.jobs.job( _ ) }) )
            },
            _embedded: {
               job: jobs.map( jobRepresentation )
            }
         };
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function getJob( request ) {
         const job = matchingJob( request.params.id );
         return job && jobRepresentation( job );
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function getJobItems( request ) {
         const job = matchingJob( request.params.id );
         return job && job.items();
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function getJobResults( request, response ) {
         const job = matchingJob( request.params.id );
         if( !job ) {
            send404( response );
            return;
         }

         const stream = recordStreamWriter( request, response, {
            headers: { [ HEADERS.CACHE_CONTROL ]: 'no-cache' }
         } );

         job.results().forEach( stream.write );
         if( job.meta().finished ) {
            endResponse();
            return;
         }

         job.subscribe( RESULT, stream.write );
         job.subscribe( META, ({ finished }) => {
            if( finished ) { endResponse(); }
         } );

         function endResponse() {
            stream.end();
            printRunSummary( request.body, job.results() );
         }
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function getJobMetrics( request, response ) {
         const job = matchingJob( request.params.id );
         if( !job ){
            send404( response );
            return;
         }

         const stream = recordStreamWriter( request, response, {
            headers: { [ HEADERS.CACHE_CONTROL ]: 'no-cache' }
         } );

         job.metrics().forEach( stream.write );
         if( job.meta().finished ){
            endResponse();
            return;
         }

         job.subscribe( METRIC, stream.write );
         job.subscribe( META, ({ finished }) => {
            if( finished ) { endResponse(); }
         } );

         function endResponse() {
            stream.end();
            printRunSummary( request.body, job.metrics() );
         }
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function getJobProgress( request, response ) {
         const job = matchingJob( request.params.id );
         if( !job ) {
            send404( response );
            return;
         }

         const stream = recordStreamWriter( request, response, {
            headers: { [ HEADERS.CACHE_CONTROL ]: 'no-cache' }
         } );

         const progress = job.progress();
         let i = 0;
         Object.keys( progress ).map( _ => progress[ _ ] ).forEach( stream.write );
         if( job.meta().finished ) {
            endResponse();
            return;
         }

         job.subscribe( PROGRESS, () => { ++i; } );
         job.subscribe( PROGRESS, stream.write );
         job.subscribe( META, ({ finished }) => {
            if( finished ) { endResponse(); }
         } );

         function endResponse() {
            stream.end();
            print( `${i} progress items sent` );
         }
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function jobRepresentation( jobApi ) {
         const meta = jobApi.meta();
         return {
            _links: {
               self: { href: hrefs.jobs.job( jobApi ) },
               progress: { href: hrefs.jobs.progress( jobApi ) },
               results: { href: hrefs.jobs.results( jobApi ) },
               metrics: { href: hrefs.jobs.metrics( jobApi ) },
               items: { href: hrefs.jobs.items( jobApi ) },
               cancel: { href: hrefs.jobs.cancel( jobApi ) }
            },
            ...meta
         };
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      function matchingJob( id ) {
         const matches = state.matchingJobs( { id } );
         return matches.length ?
            matches[ 0 ] :
            null;
      }

   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function routes( rootHref ) {
      const scenarioBaseHref = `${rootHref}/scenarios`;
      const jobBaseHref = `${rootHref}/jobs`;
      const jobPattern = `${jobBaseHref}/:id`;
      const jobCancelPattern = `${jobBaseHref}/:id/cancel`;
      const jobItemsPattern = `${jobBaseHref}/:id/items`;
      const jobProgressPattern = `${jobBaseHref}/:id/progress`;
      const jobResultsPattern = `${jobBaseHref}/:id/results`;
      const jobMetricsPattern = `${jobBaseHref}/:id/metrics`;

      return {
         entry: () => rootHref,
         version: () => `${rootHref}/version`,
         sutVersion: () => `${rootHref}/system-under-test-version`,
         context: () => `${rootHref}/context`,
         scenarios: {
            list: () => scenarioBaseHref,
            scenario: scenario => `${scenarioBaseHref}/${scenario.name}`,
            listForContextTemplate: () => `${scenarioBaseHref}{?context}`
         },
         jobs: {
            create: () => jobBaseHref,
            list: () => jobBaseHref,
            job: jobApi => jobPattern.replace( ':id', jobApi.meta().id ),
            jobPattern: () => jobPattern,
            items: jobApi => jobItemsPattern.replace( ':id', jobApi.meta().id ),
            itemsPattern: () => jobItemsPattern,
            progress: jobApi => jobProgressPattern.replace( ':id', jobApi.meta().id ),
            progressPattern: () => jobProgressPattern,
            cancel: jobApi => jobCancelPattern.replace( ':id', jobApi.meta().id ),
            cancelPattern: () => jobCancelPattern,
            results: jobApi => jobResultsPattern.replace( ':id', jobApi.meta().id ),
            resultsPattern: () => jobResultsPattern,
            metrics: jobApi => jobMetricsPattern.replace( ':id', jobApi.meta().id ),
            metricsPattern: () => jobMetricsPattern
         }
      };
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function send404( response ) {
      response.writeHead( 404, { [ HEADERS.CONTENT_TYPE ]: CONTENT_TYPES.JSON } );
      response.write( JSON.stringify( 'Not Found' ) );
      response.end();
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function loadScenarios( baseContext = {} ) {
      const loader = createLoader( {} );
      return loader.loadScenarios( baseContext, scenarios );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function handleResource( selfLink, representation ) {
      app.get( selfLink, ( req, response ) =>
         Promise.resolve( typeof representation === 'function' ? representation( req ) : representation )
            .then( repr => {
               if( repr === null ) {
                  send404( response );
                  return;
               }
               if( Array.isArray( repr ) ) {
                  response.json( repr );
                  return;
               }
               const body = {
                  ...repr,
                  _links: { self: { href: selfLink }, ...repr._links }
               };
               response.json( body );
            } )
      );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function resolvePackagePath( packagePath ) {
      const packageRoot = require.resolve( '../../index' ).replace( /\/index.js$/, '/' );
      return path.resolve( packageRoot, packagePath );
   }


   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function printRunSummary( item, runResults ) {
      const counts = outcomes.reduce( (acc, outcome) => {
         acc[ outcome ] = runResults.filter( _ => _.outcome === outcome ).length;
         return acc;
      }, {} );
      const countString = outcomes.map( _ => counts[ _ ] ).join( '/' );
      const labelString = outcomes.map( _ => _.toLowerCase() ).join( '/' );
      print( `Run complete: ${countString} (${labelString})` );
   }
};
