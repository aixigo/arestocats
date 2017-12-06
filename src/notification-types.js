/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

/**
 * @module notification-types
 */

/**
 * List of possible notification types for jobs.
 * Used to filter job-related events.
 *
 * @enum NotificationType
 */
const notificationTypes = {
   /**
    * Instructs the runner to abort job processing by skipping all remaining items immediately.
    * Long-running items with an ability to cancel themselves (returning a SKIPPED result) may also subscribe
    * to this notification.
    */
   CANCEL: 'CANCEL',

   /** Notification contains information on the result of a single test item execution */
   RESULT: 'RESULT',

   /** Notification contains information on the progress of an item */
   PROGRESS: 'PROGRESS',

   /** Notification contains information on overall state change of a test job (end time, result status) */
   META: 'META'
};

module.exports = notificationTypes;
