/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { create as createHal } from 'hal-http-client';
import { resources } from 'laxar-patterns';
import { navigation } from 'lib/util';
import { httpErrorHandler } from 'lib/util/errors';

export const injections = [ 'axConfiguration', 'axContext', 'axFeatures' ];
export function create( configuration, axContext, features ) {

   const handleError = httpErrorHandler( axContext );
   const hal = createHal( { on: { '5xx': handleError } } );
   const entryPromise = awaitResource( 'entry' );
   const publishScenarios = resources.replacePublisherForFeature( axContext, 'scenarios' );
   let sequence = 0;
   fetchScenarios( null, ++sequence );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   if( features.context.parameter ) {
      navigation.handlerFor( axContext )
         .registerParameterForFeature( 'context', {
            managed: false,
            converter: 'jsonMap',
            onChange( ctx ) {
               fetchScenarios( ctx, ++sequence );
            }
         } );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function fetchScenarios( context, seq ) {
      return entryPromise.then( entry => {
         if( sequence > seq ) { return; }
         const vars = { context: halCacheBusted( context ) };
         hal.follow( entry, 'scenarios', { vars } )
            .on( { '200': hal.thenFollowAll( 'item' ) } )
            .on( { '200': publishScenarios } );
      } );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   // workaround https://github.com/aixigo/hal-http-client/issues/15
   function halCacheBusted( context ) {
      const _workaround = `${Date.now()}.${Math.random()}`;
      const workaroundContext = context || {};
      const contextToSend = JSON.stringify( { ...workaroundContext, _workaround } );
      return contextToSend;
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function awaitResource( feature ) {
      return new Promise( resolve => {
         resources.handlerFor( axContext )
            .registerResourceFromFeature( feature, {
               onUpdateReplace( { data } ) { resolve( data ); }
            } );
      } );
   }
}
