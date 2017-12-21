/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = { metricsPublish };

const { METRIC } = require( '../notification-types' );

function metricsPublish( jobState, item ) {
   const {
      name,
      category,
      color,
      label,
      metricType,
      metricData
   } = item;
   const metrics = jobState.metrics();
   const index = metricsIndex( metrics, 'category', category );
   if( index >= 0 ) {
      const categoryMetrics = metrics[ index ];
      categoryMetrics.metrics.push( {
         name,
         color,
         id: item.$id,
         label,
         metricType,
         value: metricData[ label ]
      } );
      jobState.notify( METRIC, categoryMetrics );
   }
   else {
      const categoryMetrics = {
         category,
         metrics: [ {
            name,
            color,
            id: item.$id,
            label,
            metricType,
            value: metricData[ label ]
         } ]
      };
      jobState.notify( METRIC, categoryMetrics );
   }
}

function metricsIndex( array, attr, value ){
   for(let i = 0; i < array.length; ++i){
      if( array[ i ].hasOwnProperty( attr ) && array[ i ][ attr ] === value ) {
         return i;
      }
   }
   return -1;
}
