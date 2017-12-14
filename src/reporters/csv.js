/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = report;

const fs = require( 'fs' );
const path = require( 'path' );
const { outcomes } = require( '../outcomes.js' );

const reportsPath = 'reports';
const resultsPath = path.join( reportsPath, 'results' );
const csvDir = path.join( resultsPath, 'csv' );

function report( allResults ) {
   if( !fs.existsSync( reportsPath ) ) {
      fs.mkdirSync( reportsPath );
   }
   if( !fs.existsSync( csvDir ) ) {
      fs.mkdirSync( csvDir );
   }
   allResults.forEach( result => {
      const testsuites = buildReport( result );
      testsuites.forEach( summarizeSuite );
      fs.writeFileSync( path.join( csvDir, `${result.subject.name}.csv` ), asCsv( testsuites ) );
   } );
   summarizeCsv( csvDir );
}

function asCsv( suiteResults ) {
   let failure = 0;
   let error = 0;
   let skipped = 0;
   let success = 0;
   suiteResults.forEach( suite => {
      failure += suite.attrs.failure;
      error += suite.attrs.error;
      skipped += suite.attrs.skipped;
      success += suite.attrs.success;
   } );
   return `failures, successes, skipped, errors\n${failure}, ${success}, ${skipped}, ${error}`;
}

// summarizes all existing csv into one for better overview in jenkins project homepage.
function summarizeCsv( dir, output = 'summary.csv' ) {
   const results = fs.readdirSync( dir ).reduce( ( sum, file ) => {
      if( path.basename( file ) === output ) { return sum; }
      else if( path.extname( file ) === '.csv' ) {
         const content = fs.readFileSync( path.join( dir, file ), 'utf-8' ).split( '\n' )[ 1 ];
         return sum.map( ( res, i ) => {
            return res + Number( content.split( ',' )[ i ] );
         } );
      }
      return sum;
   }, [ 0, 0, 0, 0 ] );
   // The jenkins plot plugin expects the headline to be defined in the same fashion as below.
   fs.writeFileSync( path.join( dir, output ), `failures, successes, skipped, errors\n${results}` );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function buildReport( result, reports = [] ) {
   const {
      subject,
      outcome,
      durationMs,
      errors,
      failures,
      nested
   } = result;

   reports.push( {
      subject,
      outcome,
      children: [],
      attrs: {
         time: durationMs / 1000,
         fileName: subject.sourceFile,
         description: subject.description
      }
   } );

   if( failures.length ) { reports[ reports.length - 1 ].attrs.failures = failures; }
   if( errors ) { reports[ reports.length - 1 ].attrs.errors = errors; }
   ( nested || [] ).forEach( res => {
      buildReport( res, reports[ reports.length - 1 ].children );
   } );
   return reports;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function summarizeSuite( suite ) {
   const children = suite.children;
   children.forEach( summarizeSuite );

   outcomes.forEach( outcome => {
      const attr = outcome.toLowerCase();
      suite.attrs[ attr ] = children
         .map( child => {
            return ( child.attrs[ attr ] || 0 );
         } )
         .reduce( (a, b) => a + b, ( suite.outcome.toLowerCase() === outcome.toLowerCase() ? 1 : 0 ) );
   } );
}

