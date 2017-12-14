/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = report;

const fs = require( 'fs' );
const path = require( 'path' );

const reportsPath = 'reports';
const resultsPath = path.join( reportsPath, 'results' );
const htmlDir = path.join( resultsPath, 'html' );

function report( allResults, jobItems, jobResult ) {
   if( !fs.existsSync( reportsPath ) ) {
      fs.mkdirSync( reportsPath );
   }
   if( !fs.existsSync( htmlDir ) ) {
      fs.mkdirSync( htmlDir );
   }
   fs.writeFileSync(
      path.join( `${htmlDir}`, 'results.js' ),
      `window.arestocatResults = ${JSON.stringify( jobResult, null, 3 )};`
   );
   fs.writeFileSync(
      path.join( `${htmlDir}`, 'items.js' ),
      `window.arestocatItems = ${JSON.stringify( jobItems, null, 3 )};`
   );
}

