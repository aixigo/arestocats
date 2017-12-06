/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { create as createHal, firstRelationHref, canFollow } from 'hal-http-client';
import { resources, actions } from 'laxar-patterns';
import { httpErrorHandler } from 'lib/util/errors';

const MIME_JSON = 'application/json';

export const injections = [ 'axConfiguration', 'axContext' ];
export function create( configuration, context ) {

   const handleError = httpErrorHandler( context, { method: 'POST' } );
   const hal = createHal( { on: { '5xx': handleError } } );

   const entryPromise = awaitResource( 'entry' );
   const jobsHrefPromise = entryPromise.then( entry => firstRelationHref( entry, 'jobs' ) );
   const publishJob = resources.replacePublisherForFeature( context, 'job' );

   actions.handlerFor( context )
      .registerActionsFromFeature( 'run', ({ items }) => {
         jobsHrefPromise
            .then( jobListHref => submit( jobListHref, items ) )
            .then( jobHref => hal.get( jobHref ).then( _ => _.json() ) )
            .then( publishJob );
         return true;
      } )
      .registerActionsFromFeature( 'cancel', () => {
         entryPromise.then( entry => {
            hal.follow( entry, 'jobs' )
               .on( { '200': cancelFirst } );
         } );

         function cancelFirst( jobs ) {
            if( isEmpty( jobs, 'job' ) ) { return; }
            hal.follow( jobs, 'job' )
               .on( { '200': job => {
                  const cancelHref = firstRelationHref( job, 'cancel' );
                  hal.post( cancelHref );
               } } );
         }
      } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function submit( jobListHref, item ) {
      const headers = new Headers();
      headers.append( 'Content-Type', MIME_JSON );
      return fetch( jobListHref, { method: 'POST', headers, body: JSON.stringify( item ) } )
         .then( response => {
            if( response.status === 409 ) {
               throw new Error( 'Cannot start job. A job is already in progress.' );
            }
            return response.headers.get( 'Location' );
         } )
         .catch( handleError );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function awaitResource( feature ) {
      return new Promise( resolve => {
         resources.handlerFor( context )
            .registerResourceFromFeature( feature, {
               onUpdateReplace() { resolve( context.resources[ feature ] ); }
            } );
      } );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function isEmpty( resource, relation ) {
      return !canFollow( resource, relation ) || !resource._links[ relation ].length;
   }

}
