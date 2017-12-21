/**
 * Copyright 2017 aixigo AG
 */

import { create as createHal, firstRelationHref } from 'hal-http-client';
import { resources, actions } from 'laxar-patterns';
import { httpErrorHandler } from 'lib/util/errors';

const MIME_JSON_SEQ = 'application/json-seq';
const RS = '\x1E';

export const injections = [ 'axConfiguration', 'axContext' ];
export function create( configuration, context ) {
   const handleError = httpErrorHandler( context );
   const hal = createHal( { on: { '5xx': handleError } } );
   resources.handlerFor( context )
      .registerResourceFromFeature( 'job', {
         onUpdateReplace: ({ finished, data }) => {
            if( finished ) { return; }
            const process = window.ReadableStream ? streamResults : fetchResults;
            process( data );
         }
      } );

   const publish = resources.replacePublisherForFeature( context, 'metrics' );
   const requestFinish = actions.publisherForFeature( context, 'finish', { optional: true } );

   // HTML5 `fetch` is "unstoppable". When we destroyed, discard its output.
   let destroyed = false;
   context.eventBus.subscribe( 'endLifecycleRequest', () => { destroyed = true; } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function fetchResults( job ) {
      return hal.follow( job, 'metrics').on( { '200': publish } ).then( requestFinish );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function streamResults( job ) {
      const headers = new Headers();
      headers.append( 'Accept', MIME_JSON_SEQ );
      // break caching so that chrome will stream responses in parallel (fetch cannot abort stale requests)
      headers.append( 'pragma', 'no-cache' );
      headers.append( 'cache-control', 'no-cache' );

      const metricsHref = firstRelationHref( job, 'metrics' );
      fetch( metricsHref, { headers } )
         .then( jsonSeqProcessor( publish ) )
         .then( requestFinish )
         .catch( handleError );
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function jsonSeqProcessor( chunkCallback ) {
      return jsonSeqResponse => {
         const dec = new TextDecoder();
         const reader = jsonSeqResponse.body.getReader();
         let buffer = '';
         return reader.read().then( processChunk );

         function processChunk( chunk ) {
            if( destroyed ) { return Promise.resolve(); }

            buffer += dec.decode( chunk.value || new Uint8Array(), { stream: !chunk.done } );
            const parts = buffer.split( RS );
            if( !chunk.done ) {
               buffer = parts.pop();
            }
            const results = parts.filter( p => p.length > 0 ).map( p => JSON.parse( p ) );
            chunkCallback( results );
            return chunk.done ?
               Promise.resolve() :
               reader.read().then( processChunk );
         }
      };
   }
}
