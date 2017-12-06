/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { resources } from 'laxar-patterns';
import { httpErrorHandler } from 'lib/util/errors';

const scenarios = window.arestocatItems;
const results = window.arestocatResults;

export const injections = [ 'axConfiguration', 'axContext', 'axLog', 'axEventBus' ];
export function create( configuration, context, log, eventBus ) {
   const handleError = httpErrorHandler( context );
   const entryHref = configuration.get( `widgets.${context.widget.path}.href`, '/api' );
   const publishScenarios = resources.replacePublisherForFeature( context, 'scenarios' );
   const publishResults = resources.replacePublisherForFeature( context, 'staticResults' );

   const entryPromise = fetch( entryHref ).then( response => response.json() );
   eventBus.subscribe( 'beginLifecycleRequest', () => {
      entryPromise
         .then( publishScenarios( scenarios ) )
         .then( publishResults( results ) )
         .catch( handleError );
   } );
}
