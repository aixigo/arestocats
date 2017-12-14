/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = report;

const fs = require( 'fs' );
const path = require( 'path' );
const sanitize = require( 'sanitize-filename' );
const { outcomes } = require( '../outcomes.js' );

const reportsPath = 'reports';
const resultsPath = path.join( reportsPath, 'results' );
const csvDir = path.join( resultsPath, 'csv' );

function report( allResults ) {
   if( !fs.existsSync( reportsPath ) ) {
      fs.mkdirSync( reportsPath );
   }
   if( !fs.existsSync( resultsPath ) ) {
      fs.mkdirSync( resultsPath );
   }
   if( !fs.existsSync( csvDir ) ) {
      fs.mkdirSync( csvDir );
   }
   const summarySuite = [];
   allResults.forEach( result => {
      const testSuites = buildReport( result );
      summarySuite.push( ...testSuites );
      testSuites.forEach( summarizeSuite );
      const sanitizedFileName = sanitize(result.subject.name);
      fs.writeFileSync( path.join( csvDir, `${sanitizedFileName}.csv` ), asCsv( testSuites ) );
   } );
   fs.writeFileSync( path.join( csvDir, 'summary.csv' ), asCsv( summarySuite ) );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

