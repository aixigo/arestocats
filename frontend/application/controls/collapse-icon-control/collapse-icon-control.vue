<template>
   <h3
      class="collapse-icon-control"
      role="button"
      tabindex="0"
      @keypress.space.prevent="$emit( 'toggle' )"
      @click.stop="$emit( 'toggle' )">
      <i class="fa"
         :class="{ 'fa-plus-square': !isExpanded, 'fa-minus-square': isExpanded }"></i>
      <slot />
   </h3>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

export default {
   props: {
      isExpanded: {
         type: Boolean,
         required: true
      }
   }
};
</script>
