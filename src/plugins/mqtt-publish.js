/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

const mqtt = require( 'async-mqtt' );

module.exports = {

   runProps: () => ({
      topic: null,
      message: null,
      connectTimeout: 500,
      url: 'tcp://localhost:1883'
   }),

   /**
    * @param {Object} item
    *    test configuration
    * @param {String} item.topic
    *    the MQTT topic to publish on
    * @param {String} item.message
    *    the MQTT message to publish
    * @param {String} [item.connectTimeout=500]
    *    the MQTT connection timeout in seconds
    * @param {String} [item.url="tcp://localhost:1883"]
    *    a locator containing host/port of the MQTT service
    * @return {Promise.<RequestResult>}
    *    a test result with response information
    */
   run( { topic, message, connectTimeout, url } ) {
      const client = mqtt.connect( url, { connectTimeout, reconnectPeriod: 200, debug: true } );
      return new Promise( resolve => {
         client.on( 'connect', () => { resolve( { outcome: 'SUCCESS' } ); } );
         [ 'error', 'close' ].forEach( ev => {
            client.on( ev, msg => {
               resolve( {
                  outcome: 'FAILURE',
                  failures: [ `Connection to MQTT broker failed with event "${ev}" (payload=${msg})` ]
               } );
            } );
         } );
      } )
         .then( result => {
            if( result.outcome !== 'SUCCESS' ) {
               client.end();
               return result;
            }
            return client.publish( topic, message ).then( () => {
               client.end();
               return { ...result, message: `content published to topic: ${topic}` };
            } );
         } );
   }
};
