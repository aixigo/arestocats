/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const output = require( '../../src/plugins/output' );
const createMockRunner = require( './helpers/mock-runner' );
const assert = require( 'assert' );

describe( 'The output plugin', () => {

   let run;
   beforeEach( () => {
      ({ run } = createMockRunner( output ));
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'run on a constant input', () => {

      it( 'does not fail', () => {
         return run( { value: 'test' } )
            .then( result => {
               assert.notEqual( result.outcome, 'FAILURE' );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'does not error', () => {
         return run( { value: 'test' } )
            .catch( () => { assert.fail(); } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'generates a result message containing the constant value', () => {
         return run( { value: 'test123' } )
            .then( ({ message }) => {
               assert( /test123/.test( message ) );
            } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'of type string', () => {
         it( 'uses JSON format by default', () => {
            return run( { value: 'test123' } )
               .then( ({ message }) => {
                  assert( /"test123"/.test( message ) );
               } );
         } );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      describe( 'of type object', () => {
         it( 'uses JSON format by default', () => {
            return run( { value: { a: [ 1, 2, 3 ] } } )
               .then( ({ message }) => {
                  assert.notEqual(
                     message.replace( /\s/g, '' ).indexOf( '{"a":[1,2,3]}' ),
                     -1
                  );
               } );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'run on a valid input expression', () => {

      it( 'generates a result message containing the evaluated value expression', () => {
         return run( { value: 'test-123' } )
            .then( ({ message }) => {
               assert( /test-123/.test( message ) );
            } );
      } );

   } );

} );
