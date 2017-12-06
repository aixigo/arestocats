<template>
   <div>
      <p class="ii-description"><em>{{ error.message || error }}</em></p>
      <p v-if="error.stack" class="ii-error-details"><pre>{{ error.stack }}</pre></p>
   </div>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

export default {
   props: {
      error: {
         type: [ String, Object ]
      }
   }
};
</script>
