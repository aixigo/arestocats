/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = report;

const fs = require( 'fs' );
const path = require( 'path' );

const { htmlPath, assertPathExists } = require( './report-paths' );

function report( allResults, jobItems, jobResult ) {
   assertPathExists( htmlPath );
   fs.writeFileSync(
      path.join( `${htmlPath}`, 'results.js' ),
      `window.arestocatResults = ${JSON.stringify( jobResult, null, 3 )};`
   );
   fs.writeFileSync(
      path.join( `${htmlPath}`, 'items.js' ),
      `window.arestocatItems = ${JSON.stringify( jobItems, null, 3 )};`
   );
}

