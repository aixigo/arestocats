/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const { URL } = require('url');

const CONTENT_TYPES = {
   JSON: 'application/json',
   JSON_SEQ: 'application/json-seq'
};

const HEADERS = {
   CACHE_CONTROL: 'Cache-Control',
   CONTENT_TYPE: 'Content-Type',
   ETAG: 'ETag',
   LOCATION: 'Location'
};

module.exports = {
   composeRequestHeaders,
   composeRequestCookies,
   getIgnoreCase,
   hasIgnoreCase,
   statusMatches,
   recordStreamWriter,
   unquoted,
   HEADERS,
   CONTENT_TYPES
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getIgnoreCase( object, key, fallback ) {
   const search = key.toLowerCase();
   return Object.keys( object )
      .filter( k => k.toLowerCase() === search )
      .map( k => object[ k ] )
      .concat( [ fallback ] )[ 0 ];
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function hasIgnoreCase( object, key ) {
   const search = key.toLowerCase();
   return Object.keys( object ).some( k => k.toLowerCase() === search );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function statusMatches( expected ) {
   return actual => {
      return `${expected}`.split( ',' ).some( part => {
         const cmp = `${actual}`.split( '' );
         return `${part}`.split( '' )
            .every( (c, i) => c.toLowerCase() === 'x' || cmp[ i ] === c );
      } );
   };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function unquoted( cookieVal ) {
   return cookieVal.charAt( 0 ) === '"' && cookieVal.charAt( cookieVal.length - 1 ) === '"' ?
      cookieVal.slice( 1, -1 ) :
      cookieVal;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function recordStreamWriter( request, response, { headers } = {} ) {
   return request.accepts( CONTENT_TYPES.JSON_SEQ ) === CONTENT_TYPES.JSON_SEQ ?
      jsonSeqWriter( response, headers ) :
      jsonWriter( response, headers );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function jsonSeqWriter( response, headers ) {
   let headerSent = false;
   return {
      write( record ) {
         if( !headerSent ) {
            response.writeHead( 200, {
               ...headers,
               [ HEADERS.CONTENT_TYPE ]: CONTENT_TYPES.JSON_SEQ
            } );
            headerSent = true;
            response.write( '\x1E' );
         }
         response.write( JSON.stringify( record, jsonValue ) );
         response.write( '\n\x1E' );
      },
      end() {
         if( !headerSent ) { response.writeHead( 204 ); }
         response.end();
      }
   };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function jsonWriter( response, headers ) {
   let headerSent = false;
   return {
      write( record ) {
         if( !headerSent ) {
            response.writeHead( 200, {
               ...headers,
               [ HEADERS.CONTENT_TYPE ]: CONTENT_TYPES.JSON
            } );
            headerSent = true;
            response.write( '[\n' );
         }
         else {
            response.write( ',\n' );
         }
         response.write( JSON.stringify( record, jsonValue ) );
      },
      end() {
         if( !headerSent ) { response.writeHead( 204 ); }
         else { response.write( '\n]' ); }
         response.end();
      }
   };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function jsonValue( _, value ) {
   if( value instanceof Error ) {
      const plainError = {};
      Object.getOwnPropertyNames( value ).forEach( key => {
         plainError[ key ] = value[ key ];
      } );
      return plainError;
   }
   return value;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function composeRequestCookies( url, cookies ) {
   const enc = _ => encodeURIComponent( _ );
   const ANY = '*';
   const cookiesPath = url ? new URL( url ).pathname : ANY;
   return Object.keys( cookies )
      .map( name => {
         if( typeof cookies[ name ] === 'object' && typeof cookies[ name ].byPath === 'object' ) {
            // extended format, usually the result of a previous instance of this plugin:
            // select cookies based on path
            const match = Object.keys( cookies[ name ].byPath )
               .filter( path => cookiesPath === ANY || cookiesPath.indexOf( path ) === 0 )
               .sort( ( a, b ) => a.length - b.length )
               .map( path => cookies[ name ].byPath[ path ] )
               .filter( _ => _.value !== '' && _.value != null )
               .pop();
            return match ? `${enc(name)}=${match.value}` : null;
         }
         return `${enc(name)}=${enc(cookies[ name ])}`;
      } )
      .filter( _ => _ !== null );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function composeRequestHeaders( headers, expectedType, contentType, cookiesList ) {
   return {
      ...headers,
      ...( expectedType && !hasIgnoreCase( headers, 'accept' ) ? { Accept: expectedType } : {} ),
      ...( contentType && !hasIgnoreCase( headers, 'content-type' ) ? { 'Content-Type': contentType } : {} ),
      ...( cookiesList && cookiesList.length ? { Cookie: cookiesList.join( '; ' ) } : {} )
   };
}

