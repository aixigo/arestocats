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
      const metric = metrics[ index ];
      metric.names.push( name );
      metric.colors.push( color);
      metric.id.push( item.$id );
      metric.labels.push( label );
      metric.metricTypes.push( metricType );
      metric.values.push( metricData[ label ] );
      jobState.notify( METRIC, metric );
   }
   else {
      const metric = {
         names: [ name ],
         category,
         metricTypes: [ metricType ],
         id: [ item.$id ],
         colors: [ color ],
         labels: [ label ],
         values: [ metricData[ label ] ]
      };
      jobState.notify( METRIC, metric );
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
