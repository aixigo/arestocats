/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const assert = require( 'assert' );
const fs = require( 'fs' );
const path = require( 'path' );

const reportsPath = 'reports';
module.exports = {
   csvPath: path.join( reportsPath, 'csv' ),
   htmlPath: path.join( reportsPath, 'html' ),
   metricsPath: path.join( reportsPath, 'metrics' ),
   assertPathExists
};

function assertPathExists( reporterPath ){
   if( !fs.existsSync( reportsPath ) ) {
      fs.mkdirSync( reportsPath );
   }
   if( !fs.existsSync( reporterPath ) ) {
      fs.mkdirSync( reporterPath );
   }
   assert.ok(
      fs.existsSync( reporterPath, `${reporterPath} does not exist and couldn't be created.`)
   );
}
