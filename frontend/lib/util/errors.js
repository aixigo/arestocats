/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

export function httpErrorHandler( context, { method = 'GET' } = {} ) {
   return value => {
      const message = value instanceof Response ?
         `request failed with ${value.status}` :
         `encountered error ${value}`;

      const code = value instanceof Response ?
         `HTTP_${method}` :
         'EXCEPTION';

      context.eventBus.publish( `didEncounterError.${code}`, { code, message } );
   };
}
