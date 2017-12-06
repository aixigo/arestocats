/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {
   sequence,
   delay,
   proxy
};

function proxy( promise ) {
   let preempted = false;
   let resolve;
   let reject;
   return {
      promise: new Promise( ( res, rej ) => {
         resolve = res;
         reject = rej;
         promise.then( checked( resolve ), checked( reject ) );
      } ),
      resolve( _ ) {
         preempted = true;
         resolve( _ );
      },
      reject( _ ) {
         preempted = true;
         reject( _ );
      }
   };

   function checked( f ) {
      return val => {
         if( !preempted ) {
            f( val );
         }
      };
   }
}


function delay( milliseconds ) {
   return new Promise( resolve => {
      setTimeout( resolve, milliseconds );
   } );
}

/**
 * Run a sequence of promise-generating functions (actions).
 * Each function is invoked with the result of the previous function, so this can be used
 * as an asynchronous `reduce` operation.
 *
 * @param {Function<Promise>[]} actions
 *   a list of promise-generating functions to be run in-order
 * @param {*} acc
 *   a value to pass to the first action. Subsequent actions will be called with the result of their
 *   predecessor action
 * @param {Function} shouldCancel
 *   optional function that examines the result of the most recently run action, and should return `true` to
 *   continue or `false` to abort the sequenc
 * @return {Promise<[]>}
 *   a promise that will be fulfilled when all actions have been run in-order, with the final result
 */
function sequence( actions, acc, shouldCancel = () => false ) {
   return actions.length && !shouldCancel( acc ) ?
      actions[ 0 ]( acc ).then(
         result => sequence( actions.slice( 1 ), result, shouldCancel )
      ) :
      Promise.resolve( acc );
}
