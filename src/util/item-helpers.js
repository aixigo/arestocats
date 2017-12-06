/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

expect.TRUTHY = {};

module.exports = {
   expect,
   extractProps,
   interpret,
   itemError,
   mergeContext,
   propText
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function expect( name, actual ) {
   const s = _ => JSON.stringify( _ );
   const n = _ => _.toFixed( 2 );
   const api = {
      toBeTruthy() {
         return actual ? [] : [ `expected ${name} to be truthy but got (${s(actual)})` ];
      },
      toDeepEqual( expected ) {
         const isEqual = ( isPrimitive( expected ) && isPrimitive( actual ) ) ?
            // eslint-disable-next-line eqeqeq
            ( expected == actual ) :
            ( JSON.stringify( expected ) === JSON.stringify( actual ) );

         return isEqual ?
            [] :
            [ `expected ${name} to be equal to (${s(expected)}) but got (${s(actual)})` ];

         function isPrimitive( value ) {
            return typeof value !== 'object';
         }
      },
      toEqual( expected ) {
         if( expected === expect.TRUTHY ) {
            return api.toBeTruthy();
         }
         // eslint-disable-next-line eqeqeq
         return expected == actual ? [] :
            [ `expected ${name} to be equal to (${s(expected)}) but got (${s(actual)})` ];
      },
      toBe( expected ) {
         if( expected === expect.TRUTHY ) {
            return api.toBeTruthy();
         }
         return expected === actual ? [] :
            [ `expected ${name} to be (${s(expected)}) but got (${s(actual)})` ];
      },
      toBeAtMost( expected ) {
         const [ act, exp ] = [ actual, expected ].map( parseFloat );
         return act < exp ? [] :
            [ `expected ${name} to be at most ${n(exp)} but was ${n(act)}` ];
      },
      toBeAtLeast( expected ) {
         const [ act, exp ] = [ actual, expected ].map( parseFloat );
         return act > exp ? [] :
            [ `expected ${name} to be at least ${n(exp)} but was ${n(act)}` ];
      },
      toSatisfy( predicateBuilder, predicateName ) {
         const predicate = predicateBuilder( predicateName );
         return predicate( actual ) ? [] :
            [ `expected ${name} to satisfy ${predicateName} but got (${s(actual)})` ];
      }
   };
   return api;
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function extractProps( item, toExtract, context ) {
   return [ '$id', 'type', 'name', ...Object.keys( toExtract ) ].reduce(
      ( props, key ) => ({ ...props, [ key ]: prop( key ) }),
      {}
   );

   function prop( key ) {
      const expressionKey = `:${key}`;
      if( expressionKey in item ) {
         return interpret( item[ expressionKey ], context );
      }
      if( key in item ) {
         return item[ key ];
      }
      if( toExtract[ key ] === undefined ) {
         throw new Error( `Key "${key}" is missing for item "${item.name}" of type "${item.type}"` );
      }
      return toExtract[ key ];
   }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function propText( item, key, fallback ) {
   const expressionKey = `:${key}`;
   if( expressionKey in item ) {
      return item[ expressionKey ];
   }
   if( key in item ) {
      return item[ key ];
   }
   return fallback;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function interpret( expression, context = {} ) {
   const code = Object.keys( context )
      .filter( isValidIdentifier )
      .map( k => `const ${k} = this.${k}` )
      .concat( `return (${expression});` )
      .join( ';\n' );
   // eslint-disable-next-line no-new-func
   const f = new Function( code );
   return f.call( context );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function mergeContext( context, item ) {
   return { ...item.defaults, ...context, ...item.overrides };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isValidIdentifier( str ) {
   return /[a-zA-Z_][a-zA-Z0-9_]*/.test( str );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function itemError( message, { $loader, $fileName }, { name } ) {
   const details = `item: ${name}, file: ${$fileName}`;
   return new Error( `${$loader ? `${$loader} ` : ''}item error: ${message} (${details})` );
}
