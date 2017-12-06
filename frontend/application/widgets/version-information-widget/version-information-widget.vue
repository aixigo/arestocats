<template>
   <ul>
      <li>Test-Runner: <em>v{{ version }}</em></li>
      <li>API:
         <em v-if="sutVersion">v{{ sutVersion }}</em>
         <em v-else>N/A</em>
      </li>
      <li v-if="error">
         Error: <em>{{ error.code }} {{ error.message }}</em>
      </li>
   </ul>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { object, assert } from 'laxar';
import { resources } from 'laxar-patterns';

export default {
   data() {
      return {
         version: null,
         sutVersion: null,
         error: null
      };
   },
   created() {
      this.awaitResource( 'entry' ).then( entry => {
         fetchJson( p`${entry}._links.version.href` )
            .then( _ => { this.version = _.version; } );
         fetchJson( p`${entry}._links.system-under-test-version.href` )
            .then( _ => { this.sutVersion = _.baseArtifactVersion; } );
      } );
      this.eventBus.subscribe( 'didEncounterError', error => {
         this.error = error;
      } );
   },
   methods: {
      awaitResource( feature ) {
         return new Promise( resolve => {
            resources.handlerFor( this )
               .registerResourceFromFeature( feature, {
                  onUpdateReplace: () => { resolve( this.resources[ feature ] ); }
               } );
         } );
      }
   }
};

function fetchJson( url ) {
   return fetch( url ).then( _ => _.json() );
}

function p( input, ...substitutions ) {
   assert.state( input[ 0 ] === '' );
   assert.state( input[ 1 ].indexOf( '.' ) === 0 );

   const segments = [];
   input.forEach( ( seg, i ) => {
      if( i === 0 ) { return; }
      segments.push( seg );
      if( substitutions.length > i ) {
         segments.push( `${substitutions[ i ]}` );
      }
   } );
   return object.path( substitutions[ 0 ], segments.join( '' ).slice( 1 ) );
}
</script>
