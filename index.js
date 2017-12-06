/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const path = require( 'path' );
const fs = require( 'fs' );
const minimist = require( 'minimist' );

const createState = require( './src/services/state' );
const createRestService = require( './src/services/rest-service' );
const createCli = require( './src/services/cli' );

const { print } = require( './src/util/general-helpers' );

module.exports = { main };

if( require.main === module ) {
   main();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function main() {

   const options = minimist( process.argv.slice( 2 ) );
   const state = createState();
   const scenarios = collectScenarios( options._, options.src || 'scenarios' );
   const { context = {} } = options;

   if( options.service ) {
      const restService = createRestService( state, { scenarios, ...options.service } );
      restService.start( context );
   }

   if( options.cli || !options.service ) {
      const cli = createCli( state, {
         scenarios,
         ...options.cli,
         reporters: options.cli ? ( options.cli.reporters || 'stdout' ).split( ',' ) : [ 'stdout' ]
      } );
      cli.run( context )
         .then( success => {
            if( !options.service ) {
               process.exit( success ? 0 : 1 );
            }
         } );
   }

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function collectScenarios( args, src ) {
   let entries = [];
   try {
      entries = ( args && args.length ) ? args : fs.readdirSync( src );
   }
   catch( e ) {
      print( `The folder "${src}" could not be found. Exiting.` );
      process.exit( 1 );
   }

   return entries
      .map( entry => path.resolve( process.cwd(), `${src}/${entry}` ) )
      .map( entry => {
         if( !fs.existsSync( entry ) ) {
            print( `The scenario "${entry}" could not be found. Exiting.` );
            process.exit( 1 );
         }
         return entry;
      } );
}

