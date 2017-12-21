/**
 * Copyright 2017 aixigo AG
 */
import { resources } from 'laxar-patterns';
import { httpErrorHandler } from 'lib/util/errors';

const metrics = window.arestocatMetrics;

export const injections = [ 'axConfiguration', 'axContext', 'axLog', 'axEventBus' ];
export function create( configuration, context, log, eventBus ) {
   const handleError = httpErrorHandler( context );
   const entryHref = configuration.get( `widgets.${context.widget.path}.href`, '/api' );
   const publish = resources.replacePublisherForFeature( context, 'staticMetrics' );

   const entryPromise = fetch( entryHref ).then( response => response.json() );
   eventBus.subscribe( 'beginLifecycleRequest', () => {
      entryPromise
         .then( publish( metrics ) )
         .catch( handleError );
   } );
}
