/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = report;

const { red, grey, green, yellow, blue } = require( 'colors/safe' );
const { print } = require( '../util/general-helpers' );

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function report( results ) {
   results.forEach( res => { reportSingleResult( res ); } );
}

function reportSingleResult( result, indent = 0 ) {
   const {
      subject: { name, type, description, sourceFile, role },
      outcome,
      durationMs,
      errors,
      failures,
      message,
      nested = []
   } = result;

   const space = Array( indent + 1 ).join( ' ' );
   const [ color, details ] = {
      SUCCESS: () => [ green, reindent( message ) ],
      SKIPPED: () => [ grey, message ],
      FAILURE: () => [ yellow, yellow( reindent(failures) ) ],
      ERROR: () => [
         red,
         `${red(errors)} ${reindent( errors[ 0 ] && ( errors[ 0 ].stack || JSON.stringify(errors) ) )}`
      ]
   }[ outcome ]();

   const itemSource = sourceFile ? `| .../${sourceFile}` : '';
   const itemInfo = `[${type} ${name} ${itemSource}] ${description ? ` - ${description}` : ''}`;
   const timeInfo = `${formatDuration(durationMs)}`;
   print( `${space}+ ${color(outcome)} ${timeInfo} ${itemInfo}`);
   if( details ) {
      print( grey( `${space}  ${details}` ) );
   }

   if( outcome === 'SUCCESS' && nested.length && [ 'prepare', 'cleanup' ].includes( role ) ) {
      print( grey( `${space}  role=${role}: omitting nested items` ) );
   }
   else {
      nested.forEach( _ => { reportSingleResult( _, indent + 4 ); } );
   }

   function reindent( content ) {
      if( typeof content === 'string' ) {
         return content.indexOf( '\n' ) === -1 ?
            `${content}` :
            reindent( content.split( '\n' ) );
      }
      if( Array.isArray( content ) ) {
         return [ '', ...content ].map( reindent ).join( `\n${space}  ` );
      }
      if( typeof content === 'undefined' ) {
         return '';
      }
      return reindent( `${content}` );
   }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function formatDuration( durationMs ) {
   const precisionLimits = [
      { max: 10, value: 3 },
      { max: 100, value: 2 },
      { max: 1000, value: 1 },
      { max: Infinity, value: 0 }
   ];
   const colorLimits = [
      { max: 1, value: grey },
      { max: 10, value: _ => _ },
      { max: 100, value: blue },
      { max: 15000, value: yellow },
      { max: Infinity, value: red }
   ];

   const precision = select( precisionLimits );
   const color = select( colorLimits );
   return color( `[${durationMs.toFixed( precision )}ms]` );

   function select( limits ) {
      return limits.filter( ({ max }) => durationMs < max ).shift().value;
   }
}
