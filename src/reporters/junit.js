/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = report;

const jsonToXml = require( 'jsontoxml' );
const fs = require( 'fs' );
const path = require( 'path' );
const { outcomes } = require( '../outcomes' );

const reportsPath = 'reports';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function report( result ) {
   if( !fs.existsSync( reportsPath ) ) {
      fs.mkdirSync( reportsPath );
   }
   const testsuites = collectSuiteResults( result );
   testsuites.forEach( suite => summarizeSuite( suite ) );

   const junit = jsonToXml( testsuites, { xmlHeader: true, prettyPrint: true } );
   fs.writeFileSync( path.join( reportsPath, `${result.subject.name}.xml` ), junit );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function summarizeSuite( suite ) {
   const children = suite.children;
   ( children || [] ).forEach( summarizeSuite );

   outcomes.forEach( outcome => {
      const attr = outcome.toLowerCase();
      suite.attrs[ attr ] = ( children || [] )
         .map( child => child.attrs[ attr ] )
         .reduce( (a, b) => a + b, ( suite.attrs.outcome === outcome ? 1 : 0 ) );
   } );
   suite.attrs.tests = outcomes
      .reduce( (count, o) => count + suite.attrs[ o.toLowerCase() ], 0 );
   suite.attrs.failures = suite.attrs.failure;
   suite.attrs.errors = suite.attrs.error;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function collectSuiteResults( result, suites = [] ) {
   const {
      subject: { name, type, description, sourceFile },
      outcome,
      durationMs,
      errors,
      failures,
      message,
      nested
   } = result;

   const junitName = ( type === 'suite' ) ? 'testsuite' : 'testcase';
   suites.push( {
      name: junitName,
      children: [],
      attrs: {
         name,
         time: durationMs / 1000,
         fileName: sourceFile,
         outcome
      }
   } );

   if( junitName === 'testcase' ) {
      if( outcome === 'ERROR' || outcome === 'FAILURE' ) {
         const text =
            `In file ${sourceFile} - description: ${description || ''}` +
            `\nStacktrace: ${errors ? errors : failures}\n`;

         suites[ suites.length - 1 ].children.push( {
            name: outcome.toLowerCase(),
            text,
            attrs: {
               message,
               errors,
               failures
            }
         } );
      }
   }
   ( nested || [] ).forEach( _ => {
      collectSuiteResults( _, suites[ suites.length - 1 ].children );
   } );
   return suites;
}

