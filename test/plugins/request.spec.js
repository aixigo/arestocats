/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const request = require( '../../src/plugins/request' );
const createMockRunner = require( './helpers/mock-runner' );
const assert = require( 'assert' );
const fetchMock = require( 'fetch-mock' );

describe( 'The request plugin', () => {

   let run;
   beforeEach( () => {
      ({ run } = createMockRunner( request ));
   } );

   afterEach( () => {
      fetchMock.restore();
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured against a URL that yields 200 OK on GET/PUT/POST/DELETE', () => {

      const url = 'https://example.com/basic';

      beforeEach( () => {
         [ 'delete', 'get', 'post', 'put' ].forEach( method => {
            fetchMock[ method ]( url, `${method.toUpperCase()} used` );
         } );
      } );

      it( 'succeeds', () => {
         return run( { url, expectedType: null } ).then( ({ outcome }) => {
            assert.equal( outcome, 'SUCCESS' );
         } );
      } );

      it( 'uses GET by default', () => {
         return run( { url, expectedType: null } ).then( ({ response }) => {
            assert.equal( response.text, 'GET used' );
         } );
      } );


      it( 'supports configuration of DELETE, PUT, POST instead', () => {
         return Promise.all( [ 'delete', 'put', 'post' ].map( method => {
            return run( { url, method, expectedType: null } ).then( ({ response }) => {
               assert.equal( response.text, `${method.toUpperCase()} used` );
            } );
         } ) );
      } );

      it( 'saves the response status code within the $results', () => {
         return run( { url, expectedType: null } ).then( ({ response }) => {
            assert.equal( response.status, '200' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured against a resource with invalid Content-Length', () => {

      const url = 'https://example.com/7of9';

      beforeEach( () => {
         fetchMock.get( url, {
            body: '7 bytes',
            headers: { 'Content-Type': 'text/plain', 'Content-Length': '9' }
         } );
      } );

      it( 'fails with a content-length mismatch', () => {
         return run( { url, expectedType: 'text/plain' } ).then( ({ outcome }) => {
            assert.equal( outcome, 'FAILURE' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured to send a body string', () => {

      const url = 'https://example.com/echo';

      beforeEach( () => {
         fetchMock.get( url, (_, { body }) => body );
      } );

      it( 'sends along the configured body', () => {
         return run( { url, body: 'MUCH DATA' } )
            .then( ({ outcome, response }) => {
               assert.equal( outcome, 'SUCCESS' );
               assert.equal( response.text, 'MUCH DATA' );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured to send jsonBody data', () => {

      const url = 'https://example.com/my-json';

      beforeEach( () => {
         fetchMock.put( url, (_, { body, headers }) => ({
            headers,
            body: { myHeaders: headers, myRequest: JSON.parse( body ) }
         }) );
      } );

      it( 'sends along the configured body', () => {
         const jsonBody = { value: 'MUCH DATA' };
         return run( { url, jsonBody, method: 'PUT' } )
            .then( ({ outcome, response }) => {
               assert.equal( response.headers[ 'content-type' ], 'application/json' );
               assert.equal( response.text, JSON.stringify( {
                  myHeaders: { 'Content-Type': 'application/json' },
                  myRequest: jsonBody
               } ) );
               assert.deepEqual( response.json.myRequest, jsonBody );
               assert.equal( outcome, 'SUCCESS' );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured against a resource that yields 200 OK and some JSON', () => {

      const url = 'https://example.com/json';

      beforeEach( () => {
         fetchMock.mock( url, {
            body: { this: { is: 'DATA!' } },
            headers: { 'Content-Type': 'application/json' }
         } );
      } );

      it( 'saves the JSON response within the $results', () => {
         return run( { url, expectedType: 'application/json' } ).then( ({ response }) => {
            assert.deepEqual( response.json.this, { is: 'DATA!' } );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured against a resource that yields 200 OK and some cookie', () => {

      beforeEach( () => {
         fetchMock.mock( 'https://example.com/cookie', {
            body: 'some body',
            headers: { 'Set-Cookie': 'mycookie=thevalue' }
         } );
      } );

      it( 'saves the cookie to the $results', () => {
         return run( { url: 'https://example.com/cookie' } ).then( ({ response }) => {
            assert.equal( response.cookies.mycookie.value, 'thevalue' );
            assert.equal( response.cookies.mycookie.isExpired, false );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured against a URL that yields status 500', () => {

      const url = 'https://example.com/fail';

      beforeEach( () => {
         fetchMock.mock( url, {
            status: 500,
            body: 'some body',
            headers: { 'Set-Cookie': 'mycookie=thevalue' }
         } );
      } );

      it( 'fails by defaults', () => {
         return run( { url, expectedType: null } ).then( ({ outcome }) => {
            assert.equal( outcome, 'FAILURE' );
         } );
      } );

      describe( 'when 500 is expected', () => {

         it( 'succeeds', () => {
            return run( { url, expectedType: null, expectedStatus: 500 } ).then( ({ outcome }) => {
               assert.equal( outcome, 'SUCCESS' );
            } );
         } );

      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured against a URL that refuses to connect', () => {

      const url = 'http://doesnotexist.invalid';

      it( 'fails, but does not error', () => {
         return run( { url } ).then( ({ outcome }) => {
            assert.equal( outcome, 'FAILURE' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'configured against a URL that requires a cookie', () => {

      const url = 'https://example.com/cookie-jar';

      beforeEach( () => {
         fetchMock.mock(
            '*',
            ( _, fetchOptions ) => {
               const cookies = extractCookies( fetchOptions );
               const status = cookies[ 'test-cookie' ] === '42' ? 200 : 401;
               return { status, headers: { 'Content-Type': 'application/json' }, body: {} };
            }
         );
      } );

      it( 'does not send a cookie by default', () => {
         const item = { url, expectedStatus: 401 };
         return run( item ).then( ({ outcome }) => {
            assert.equal( outcome, 'SUCCESS' );
         } );
      } );

      it( 'can be configured to send the cookie using the `cookies` option', () => {
         const item = { url, cookies: { 'test-cookie': 42 }, expectedStatus: 200 };
         return run( item ).then( ({ outcome }) => {
            assert.equal( outcome, 'SUCCESS' );
         } );
      } );

      it( 'can be configured to send the cookie using the `Cookie` header', () => {
         const item = { url, headers: { Cookie: 'test-cookie=42' }, expectedStatus: 200 };
         return run( item ).then( ({ outcome }) => {
            assert.equal( outcome, 'SUCCESS' );
         } );
      } );

   } );

} );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function extractCookies( fetchOptions ) {
   const cookies = {};
   Object.keys( fetchOptions.headers )
      .filter( _ => _.toLowerCase() === 'cookie' )
      .map( _ => fetchOptions.headers[ _ ].split( '; ' ) )
      .forEach( pairs => {
         pairs
            .map( _ => _.split( '=' ) )
            .forEach( ([ k, v ]) => {
               cookies[ k ] = v;
            } );
      } );
   return cookies;
}
