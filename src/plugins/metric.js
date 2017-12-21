/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const { propText } = require( '../util/item-helpers' );
const { metricsPublish } = require( '../util/metric-helpers' );

module.exports = {

   pre( context, item ) {
      const description = `Metric for ${propText( item, 'name' )} of type ${propText( item, 'metricType' )}`;
      return Promise.resolve( {
         description,
         context,
         ...item
      } );
   },

   runProps: () => ( {
      name: '',
      category: 'default',
      color: 'orange',
      label: '',
      metricType: 'GAUGE',
      metricData: null
   } ),

   /**
    * @param {Object} item
    *    test configuration
    * @param {Object[]} runner
    *    information for which metrics to generate

    * @return {Promise<Object>}
    *    a metrics object with these extra properties:
    *    - `name` (*) - name of the item
    *    - `metrics` {Object[]} -  metrics with measured values
    */
   run( item, runner ) {
      const jobState = runner.jobState();
      metricsPublish( jobState, item );
      return Promise.resolve( {
         outcome: 'SUCCESS',
         message: `The metric ${item.name} of type ${item.metricType}` +
                     ` has value ${parseFloat( item.metricData[ item.label ] ).toFixed( 2 )}.`,
         name: item.name,
         metricType: item.metricType,
         label: item.label,
         value: item.metricData[ item.label ],
         metricData: item.metricData
      } );
   }
};
