/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const assign = require( '../../src/plugins/assign' );
const createMockRunner = require( './helpers/mock-runner' );
const assert = require( 'assert' );

describe( 'The assign plugin', () => {

   let run;
   beforeEach( () => {
      ({ run } = createMockRunner( assign ));
   } );

   describe( 'run on a constant value', () => {

      it( 'does not fail', () => {
         return run( { value: 'test' } )
            .then( result => {
               assert.equal( result.outcome, 'SUCCESS' );
            } );
      } );

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'adds that value to the result', () => {
         return run( { value: 'test' } )
            .then( result => {
               assert.equal( result.value, 'test' );
            } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'run on constant properties', () => {

      it( 'does not fail', () => {
         return run( { properties: { x: 1, y: 2 } } )
            .then( result => {
               assert.equal( result.outcome, 'SUCCESS' );
            } );
      } );

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'adds that value to the result', () => {
         return run( { properties: { x: 1, y: 2 } } )
            .then( result => {
               assert.equal( result.x, 1 );
               assert.equal( result.y, 2 );
            } );
      } );

      ///////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'dangerously overrides builtin properties such as OUTCOME', () => {
         return run( { properties: { OUTCOME: 'WEIRD' } } )
            .then( result => {
               assert.equal( result.OUTCOME, 'WEIRD' );
            } );
      } );

   } );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'run on a dynamic value', () => {

      it( 'adds the result value to the result', () => {
         return run( { value: 2 } )
            .then( result => {
               assert.equal( result.value, 2 );
            } );
      } );

   } );

} );
