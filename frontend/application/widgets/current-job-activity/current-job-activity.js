/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { canFollow, create as createHal } from 'hal-http-client';
import { resources, actions } from 'laxar-patterns';
import { httpErrorHandler } from 'lib/util/errors';

export const injections = [ 'axConfiguration', 'axContext', 'axEventBus', 'axFeatures' ];
export function create( configuration, axContext, eventBus, features ) {

   const hal = createHal( { on: { '4xx|5xx': httpErrorHandler( axContext ) } } );
   const entryPromise = awaitResource( 'entry' );

   const publishJob = ifModified( resources.replacePublisherForFeature( axContext, 'job' ) );
   const publishItems = features.items.resource ?
      ifModified( resources.replacePublisherForFeature( axContext, 'items' ) ) :
      null;

   actions.handlerFor( axContext )
      .registerActionsFromFeature( 'refresh', refreshNow );

   resources.handlerFor( axContext )
      .registerResourceFromFeature( 'refresh', {
         isOptional: true,
         onUpdateReplace: ({ data }) => publishJob( data )
      } );

   let refreshLoop;
   refreshNow();
   if( features.refresh.interval !== null ) {
      eventBus.subscribe( 'endLifecycleRequest', stopRefresh );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function refreshNow() {
      stopRefresh();
      fetchCurrentJob().then( scheduleRefresh );
   }

   function stopRefresh() {
      clearTimeout( refreshLoop );
   }

   function scheduleRefresh() {
      if( features.refresh.interval !== null ) {
         refreshLoop = setTimeout( refreshNow, features.refresh.interval );
      }
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function fetchCurrentJob() {
      return entryPromise
         .then( entry =>
            hal.follow( entry, 'jobs' ).on( { '200': processJobs } ) );

      function processJobs( jobs ) {
         if( isEmpty( jobs, 'job' ) ) {
            publishJob( null );
            return publishItems ? publishItems( [] ) : null;
         }
         return hal.follow( jobs, 'job' )
            .on( {
               '200'( job ) {
                  publishJob( job );
                  return publishItems ? hal.follow( job, 'items' ).on( { '200': publishItems } ) : null;
               }
            } );
      }
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isEmpty( resource, relation ) {
      return !canFollow( resource, relation ) || !resource._links[ relation ].length;
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

function ifModified( publisher ) {
   let jsonPrevious = 'null';
   return function( value ) {
      const jsonNew = JSON.stringify( value );
      if( jsonPrevious === jsonNew ) { return Promise.resolve(); }
      jsonPrevious = jsonNew;
      return publisher( value );
   };
}
