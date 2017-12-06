/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {
   resultTrees
};

function resultTrees( items, results ) {
   const resultsById = mapBy( results, _ => _.subject.$id );
   return items.map( resultBranch );

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function resultBranch( item ) {
      return {
         ...lookupResult( item ),
         ...( item.items ? { nested: item.items.map( resultBranch ) } : {} )
      };
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function lookupResult( item ) {
      return resultsById[ item.$id ];
   }

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   function mapBy( list, f ) {
      const map = {};
      list.forEach( _ => {
         map[ f( _ ) ] = _;
      } );
      return map;
   }
}
