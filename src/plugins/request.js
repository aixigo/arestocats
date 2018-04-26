/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/* global fetch */
require( 'isomorphic-fetch' );

const { expect, propText } = require( '../util/item-helpers' );
const {
   composeRequestCookies, composeRequestHeaders, getIgnoreCase, statusMatches, unquoted
} = require( '../util/http-helpers' );
const { zip } = require( '../util/general-helpers' );
const { delay } = require( '../util/async-helpers' );

/**
 * @typedef {RequestResult}
 * @property {Object} response
 *    interesting parts of the HTTP response
 * @property {Object} response.cookies
 *    values from the 'set-cookie' headers, grouped by name
 * @property {Object} response.headers
 *    response headers, with names lowercased
 * @property {Number} response.json
 *    for responses with JSON content-type, the parsed representation, else null
 * @property {Number} response.length
 *    the number of characters of the decoded response body
 * @property {String} response.status
 *    the HTTP status code
 * @property {String} response.statusText
 *    the response status message (such as "OK" for a 200 response)
 * @property {Number} response.text
 *    response contents, up to the specified limit in length
 */

module.exports = {

   pre( context, item ) {
      return Promise.resolve({
         description: `${propText(item, 'method', 'GET')} ${propText(item, 'url')}`,
         context,
         ...item
      });
   },

   runProps: () => ({
      url: undefined,
      body: '',
      checkLength: true,
      cookies: null,
      context: {},
      expectedStatus: '2xx,3xx',
      headers: {},
      jsonBody: null,
      limit: 1024 * 1024,
      method: 'GET',
      pollForMs: 0,
      pollDelayMs: 100,
      redirect: 'follow'
   }),

   /**
    * @param {Object} item
    *    test configuration
    * @param {String} item.url
    *    the URL to make the request to
    * @param {String} [item.body=null]
    *    a request entity to be sent to the server, usually as part of POST or PUT requests
    * @param {String} [item.checkLength=true]
    *    if true, verify that any advertised Content-Length matches the actual response length
    * @param {String} [item.cookies={}]
    *    named cookies to send to the server using an additional header
    * @param {String} [item.expectedStatus='2xx']
    *    status code pattern to expect (use 'xxx' to ignore)
    * @param {String} [item.expectedType=null]
    *    expected content type. Used to check the response. If this is `application/json` or any
    *    `application/...+json` type, the response body is parsed as JSON and stored as field `json` within
    *    the results. This is also used for the `Accept` header if none is specified.
    * @param {Object} [item.headers={}]
    *    named request headers to send. If no `Accept` header is given, one is automatically added based on
    *    the `expectedType` parameter (if set)
    * @param {String} [item.jsonBody='']
    *    an object to be converted to a JSON request entity, usually as part of POST or PUT requests.
    *    If given, this takes precedence over the body. If `null`, no entity is sent
    * @param {Number} [item.limit=1024 * 1024]
    *    maximum prefix of text responses to keep in the result, null for "no limit". JSON responses
    *    exceeding the length limit will not be decoded. Instead, the string "NOT PARSING: too long"
    *    will be stored in the JSON field
    * @param {String} [item.method='GET']
    *    the HTTP verb to use
    * @param {String} [item.pollForMs=0]
    *    retry every `pollDelayMs` milliseconds until this time has passed, or until a successful result
    * @param {String} [item.pollDelayMs=100]
    *    default polling frequency to use when `pollForMs` is > 0
    * @param {String} [item.redirect='follow']
    *    determines whether to follow redirects automatically ('follow') or manually ('manual'), or whether
    *    to forbid redirects altogether ('error')
    *
    * @param {Object} runner
    *    a test runner instance, used to lookup shared cookies
    *
    * @return {Promise.<RequestResult>}
    *    a test result with response information
    */
   run( item, runner ) {
      const {
         url,
         expectedType,
         method,
         redirect,
         pollForMs,
         pollDelayMs,
         context
      } = item;

      const contentType = item.jsonBody ? 'application/json' : null;
      const cookiesList =
         composeRequestCookies( url, item.cookies || runner.interpret( context, context.cookiesRef ) || {} );
      const headers = composeRequestHeaders( item.headers, expectedType, contentType, cookiesList );

      const body = item.jsonBody ?
         JSON.stringify( item.jsonBody ) :
         ( item.body || undefined );
      const options = { method, redirect, headers, ...( body ? { body } : {} ) };
      const startMs = Date.now();

      return makeRequest();

      function makeRequest() {
         return fetch( url, options )
            .then( response => processResponse( item, response, options ), err => {
               if( pollForMs > Date.now() - startMs ) {
                  return delay( pollDelayMs ).then( makeRequest );
               }
               else {
                  // Treat network errors as regular FAILURE (since e.g. the required host is not up)
                  const failures = [ `${err} (${method} ${url})` ];
                  return { outcome: 'FAILURE', failures };
               }
            } );
      }
   }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function processResponse( item, response, requestOptions ) {
   const { method, url } = item;
   const { status, statusText } = response;
   const headersByName = headersLists( response.headers );
   const cookies = parseResponseCookies( headersByName );
   const headers = headersMap( headersByName );
   const type = parseResponseType( headers );
   const expectedLength = headers[ 'content-length' ];

   return response.text().then( text => {
      const failures = validateResponse( item, expectedLength, { status, type, text } )
         .map( f => `${f} (${method} ${url})` );

      const responseDetails = {
         headers,
         cookies,
         status,
         statusText,
         length: text ? text.length : 0,
         text: applyLimit( text ),
         json: applyLimitToJson( text )
      };

      return {
         outcome: failures.length ? 'FAILURE' : 'SUCCESS',
         failures,
         message: `${status}, received ${byteLength(text)} bytes from ${url}`,
         response: responseDetails,
         details: {
            requestBody: requestOptions.jsonBody || applyLimit( requestOptions.body ),
            requestHeaders: requestOptions.headers,
            ...responseDetails
         }
      };
   } );

   function applyLimitToJson( text ) {
      if( !isJson( type ) ) {
         return null;
      }
      if( text.length > item.limit ) {
         return 'NOT PARSING: too long';
      }
      return JSON.parse( text );
   }

   function applyLimit( text ) {
      if( text === undefined ) {
         return '';
      }
      if( item.limit === null ) {
         return text;
      }
      return `${text}`.slice( 0, item.limit );
   }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function validateResponse( item, expectedLength, { status, type, text } ) {
   const statusResult = expect( 'status', status ).toSatisfy( statusMatches, item.expectedStatus );
   const typeResult = item.expectedType ?
      expect( 'content-type', type ).toEqual( item.expectedType ) : [];
   const lengthResult = item.checkLength ?
      expect( 'content-length', text ).toSatisfy( lengthMatches, expectedLength ) : [];
   return [ ...statusResult, ...typeResult, ...lengthResult ];
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function parseResponseType( headers ) {
   const responseTypeHeaders = headers[ 'content-type' ];
   return responseTypeHeaders ?
      responseTypeHeaders.split( ';' )[ 0 ] :
      null;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function isJson( responseType ) {
   return /application[/]([a-zA-Z0-9.-]+[+])?json/.test( responseType );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function parseResponseCookies( headerLists ) {
   const setCookieList = getIgnoreCase( headerLists, 'set-cookie' );
   if( !setCookieList ) {
      return {};
   }
   const cookies = {};
   setCookieList.forEach( entry => {
      const [ kv, ...paramList ] = entry.split( '; ' );
      const [ key, value ] = kv.split( '=' );
      const params = paramList.reduce( (acc, pv) => {
         const [ p, v ] = pv.split( '=' );
         return { ...acc, [ p.toLowerCase() ]: v };
      }, {} );
      const isExpired = params.expires ? new Date( params.expires ) < new Date() : false;

      const newEntry = {
         isExpired,
         params,
         value: unquoted( value )
      };
      const existingEntry = cookies[ key ];
      cookies[ key ] = { ...newEntry };
      cookies[ key ].byPath = {
         [ params.path ]: newEntry,
         ...( existingEntry ? existingEntry.byPath : {} )
      };
   } );
   return cookies;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generate a map of value-lists from a list of name/value-pairs.
 * Header names are normalized to all-lowercase and used to group values.
 *
 * @param {Array<String[]>} isomorphicFetchHeaders
 *    a list of (header name, header value) pairs
 *
 * @return {Object<String, String[]>}
 *    the resulting unordered, grouped headers
 */
function headersLists( isomorphicFetchHeaders ) {
   const result = {};
   isomorphicFetchHeaders.forEach( ( v, k ) => {
      const key = k.toLowerCase();
      if( key in result ) {
         result[ key ] = [ ...result[ key ], v ];
      }
      else {
         result[ key ] = [ v ];
      }
   } );
   return result;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * An easy-to-use headers-representation which disregards order, normalizes header names to all-lowercase and
 * concatenates multiple values for the same header name (using `, `). This representation format is used by
 * the `response.headers` field of the request result.
 *
 * @param {Object<String, String[]>} headers
 *     a normalized "multimap" structure as generated by the `headersLists` function
 *
 * @return {Object<String, String>}
 *     a simplified representation with values joined using `, `
 */
function headersMap( headers ) {
   return Object.keys( headers )
      .map( k => [ k, headers[ k ].join( ', ' ) ] )
      .reduce( zip, {} );
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function byteLength( responseText ) {
   return Buffer.from( responseText, 'utf-8' ).byteLength;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function lengthMatches( headerExpectation ) {
   if( headerExpectation == null ) {
      return () => true;
   }
   return text => parseInt( headerExpectation, 10 ) === byteLength( text );
}
