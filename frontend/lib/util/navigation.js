/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { assert } from 'laxar';
import { collectIndex, isEmpty, zip } from 'lib/util/functional';
import BitSet from 'bitset';

const noOp = () => {};
const newObject = () => ({});
const unpack = f => typeof f === 'function' ? f() : f;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const converters = {
   string: ( fallback = null ) => ({
      encode: _ => `${_}`,
      decode: _ => _,
      fallback: () => unpack( fallback )
   }),
   json: ( fallback = null ) => ({
      encode: _ => JSON.stringify( _ ),
      decode: _ => JSON.parse( _ ),
      fallback: () => unpack( fallback )
   }),
   jsonMap: ( fallback = newObject ) => ({
      encode: _ => Object.keys( _ ).length ? JSON.stringify( _ ) : null,
      decode: _ => _ ? JSON.parse( _ ) : unpack( fallback ),
      fallback: () => unpack( fallback )
   }),
   stringSet: ( separator = '_', fallback = newObject ) => ({
      encode: _ => {
         const keys = Object.keys( _ );
         return keys.length ? keys.join( separator ) : null;
      },
      decode: _ => _ ?
         _.split( separator ).map( k => [ k, true ] ).reduce( zip, {} ) :
         unpack( fallback ),
      fallback: () => unpack( fallback )
   }),
   bitSet: ( fallback = newObject ) => ({
      encode: _ => {
         if( !_ ) { return null; }
         const bs = new BitSet();
         Object.keys( _ ).forEach( i => { bs.set( i, _[ i ] ); } );
         return isEmpty( _ ) ? null : base64( bs.toString( 16 ) );
      },
      decode: _ => _ ?
         BitSet.fromHexString( hex( `${_}` ) ).toArray().reduce( collectIndex, {} ) :
         unpack( fallback ),
      fallback: () => unpack( fallback )
   }),
   number: ( fallback = null ) => ({
      encode: _ => `${_}`,
      decode: _ => parseFloat( _ ),
      fallback: () => unpack( fallback )
   })
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function publisherForFeature( context, featureName, options = {} ) {
   const { eventBus, features } = context;
   const { target = '_self', onChange = noOp, managed = false } = options;
   const converter = selectConverter( options );
   const parameter = parameterName( features, featureName );
   if( managed ) {
      handlerFor( context ).registerParameterForFeature( featureName, { converter, onChange } );
   }

   return ( value = context.parameters[ featureName ] ) => {
      const data = { [ parameter ]: converter.encode( value ) };
      return eventBus.publish( `navigateRequest.${target}`, { target, data } );
   };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function handlerFor( context ) {
   const { eventBus, features } = context;
   const api = { registerParameterForFeature };
   return api;

   function registerParameterForFeature( featureName, options = {} ) {
      const parameter = parameterName( features, featureName );
      const { onChange = noOp, managed = true } = options;
      const converter = selectConverter( options );

      eventBus.subscribe( 'didNavigate', ({ data }) => {
         const value = parameter in data ?
            converter.decode( data[ parameter ] ) :
            converter.fallback();

         if( managed ) {
            context.parameters[ featureName ] = value;
         }
         onChange( value );
      } );

      return api;
   }

}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function parameterName( features, featureName ) {
   const message = `features.${featureName}.parameter must be a string`;
   const featureConfig = features[ featureName ];
   assert( featureConfig, message ).hasType( Object ).isNotNull();
   const parameter = featureConfig.parameter;
   assert( parameter, message ).hasType( String ).isNotNull();
   return parameter;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function selectConverter( { converter } ) {
   return typeof converter === 'string' ?
      converters[ converter ]() :
      converter;
}

function hex( b64 ) {
   const charCodes = atob( b64 );
   let b16 = '';
   for( let i = 0; i < charCodes.length; ++i ) {
      const pair = charCodes.charCodeAt( i ).toString( 16 );
      b16 += pair.length === 2 ? pair : `0${pair}`;
   }
   return b16.toUpperCase();
}

function base64( b16 ) {
   const bytePairs = b16.length % 2 === 1 ? `0${b16}` : b16;
   const b64 = btoa( bytePairs.match( /\w{2}/g )
      .map( a => String.fromCharCode( parseInt( a, 16 ) ) )
      .join( '' ) );
   return b64;
}
