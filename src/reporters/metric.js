/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const fs = require( 'fs' );
const path = require( 'path' );
const sanitize = require( 'sanitize-filename' );

const { htmlPath, metricsPath, assertPathExists } = require( './report-paths' );

module.exports = { generateJSON };

function generateJSON( metrics, htmlFrontendFlag ) {
   assertPathExists( metricsPath );
   metrics.forEach( metric => {
      const sanitizedFileName = sanitize( metric.category );
      fs.writeFileSync(
         path.join( metricsPath, `${sanitizedFileName}.json` ),
         JSON.stringify( metric, null, 3 )
      );
   } );
   if( htmlFrontendFlag ) {
      // Writes metrics for interactive html frontend
      assertPathExists( htmlPath );
      fs.writeFileSync(
         path.join( htmlPath, 'metrics.js' ),
         `window.arestocatMetrics = ${JSON.stringify( metrics, null, 3 )};`
      );
   }
}

