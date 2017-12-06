/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

module.exports = {
   type: 'mqtt-publish',
   description: 'publish something to a dummy topic',
   ':url': 'mqttUrl',
   topic: 'dummy-topic',
   message: 'dummy-message'
};
