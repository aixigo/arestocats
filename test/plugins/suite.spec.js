/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const suite = require( '../../src/plugins/suite' );
const createMockLoader = require( './helpers/mock-loader' );
const createMockRunner = require( './helpers/mock-runner' );
const assert = require( 'assert' );

describe( 'The suite plugin', () => {

   let pre;
   let run;
   beforeEach( () => {
      ({ pre } = createMockLoader( suite ));
      ({ run } = createMockRunner( suite ));
   } );

   describe( 'preprocessing an empty suite', () => {

      it( 'does nothing', () => {
         return pre( {}, { items: [] } ).then( result => {
            assert.deepEqual( result.items, [] );
            assert.deepEqual( result.context, {} );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'preprocessing a suite with items', () => {

      it( 'passes on the suite context', () => {
         return pre(
            { paramA: 42 },
            { items: [
               { type: 'output' },
               { type: 'output', defaults: { paramA: 13, paramB: 'B' } },
               { type: 'output', overrides: { paramA: 5, paramB: 'B' } }
            ] }
         ).then( result => {
            assert.equal( result.items[ 0 ].context.paramA, 42 );
            assert.equal( result.items[ 1 ].context.paramA, 42 );
            assert.equal( result.items[ 2 ].context.paramA, 5 );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'running an empty suite', () => {

      it( 'results in success', () => {
         return run( { items: [] } )
            .then( result => {
               assert.equal( result.outcome, 'SUCCESS' );
            } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'running a suite with all items successful', () => {

      it( 'propagates the suite outcome', () => {
         const testItem = { items: [
            { type: 'output' },
            { type: 'output' }
         ] };
         return pre( {}, testItem ).then( run ).then( result => {
            assert.equal( result.outcome, 'SUCCESS' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'running a suite with a failing item', () => {

      it( 'propagates the failing outcome', () => {
         const testItem = { items: [
            { type: 'output' },
            { type: 'expect', $mockResult: { outcome: 'FAILURE' } },
            { type: 'output' }
         ] };
         return pre( {}, testItem ).then( run ).then( result => {
            assert.equal( result.outcome, 'FAILURE' );
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'with an erroring item', () => {

      it( 'propagates the error outcome', () => {
         const testItem = { items: [
            { type: 'output' },
            { type: 'expect', $mockResult: { outcome: 'ERROR' } },
            { type: 'output' }
         ] };
         return pre( {}, testItem ).then( run ).then( result => {
            assert.equal( result.outcome, 'ERROR' );
         } );
      } );

   } );

} );
