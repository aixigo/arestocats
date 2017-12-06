<template>
   <div
      :tabindex="activationEnabled ? 0 : null"
      :role="activationEnabled ? 'button' : null"
      @click="activationEnabled && $emit( 'activate', item )"
      @keypress.space.prevent="activationEnabled && $emit( 'activate', item )"
      @focus="$emit( 'highlight', item )"
      @mouseover="$emit( 'highlight', item )"
      @mouseout="$emit( 'highlight', null )"
      class="item-status-control"
      :class="propClasses">
      <i class="fa"></i>
      <span v-if="resultLabel" class="item-status-details" >
         {{ resultLabel }}
      </span>
   </div>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import { durationLabel } from 'lib/util/format';
export default {
   props: {
      item: {
         type: Object,
         required: true
      },
      result: {
         type: Object,
         default: null
      },
      activationEnabled: {
         type: Boolean,
         default: false
      },
      isBusy: {
         type: Boolean,
         default: false
      },
      isHighlighted: {
         type: Boolean,
         default: false
      },
      isStale: {
         type: Boolean,
         default: false
      },
      isInProgress: {
         type: Boolean,
         default: false
      },
      useCompactDisplay: {
         type: Boolean,
         default: false
      },
      fallbackLabel: {
         type: String,
         default: null
      }
   },
   computed: {
      propClasses() {
         const { outcome = 'UNKNOWN' } = this.result || {};
         const { role = 'test' } = this.item.context;
         return {
            [ `item-status-role-${role.toLowerCase()}` ]: true,
            [ `item-status-outcome-${outcome.toLowerCase()}` ]: true,
            'item-status-activation-enabled': this.activationEnabled,
            'item-status-highlighted': this.isHighlighted,
            'item-status-stale': this.isStale,
            'item-status-busy': this.isBusy,
            'item-status-progress': this.isInProgress,
            'item-status-control-compact': this.useCompactDisplay
         };
      },
      resultLabel() {
         const { result } = this;
         if( !result ) {
            return this.fallbackLabel;
         }
         return result.outcome === 'SUCCESS' ?
            durationLabel( result.durationMs ) :
            result.outcome;
      }
   }
};
</script>
