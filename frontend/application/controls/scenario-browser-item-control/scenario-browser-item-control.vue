<template>
   <div v-if="!hidden"
      class="scenario-browser-item-control">
      <div class="sb-item-details" :class="statusClasses">
         <item-status-control
            :item="item"
            :result="result"
            :is-busy="item.$id in view.busySet"
            :is-in-progress="inProgress"
            :is-highlighted="item.$id in view.highlightSet"
            :is-stale="item.$id in view.staleSet"
            :use-compact-display="true"
            :activation-enabled="settings.activationEnabled"
            @activate="settings.activationEnabled && $emit( 'activate', $event )"
            @highlight="settings.activationEnabled && $emit( 'highlight', $event )"
            class="pull-left"
          />
         <h4 class="sb-item-description" v-tooltip.bottom="item.description ? `${item.description} (${item.name})` : item.name">
            <span tabindex="0"
               role="button"
               class="sb-item-description-text"
               @focus="$emit( 'select', item )"
               @keypress.space.prevent="$emit( 'activate', item )"
               @keydown.left.prevent="setExpanded( false, $event.shiftKey )"
               @keydown.right.prevent="setExpanded( true, $event.shiftKey )"
               @keydown.up.prevent="focusPrevious"
               @keydown.down.prevent="focusNext">
               {{ item.description }}
               <small>{{ item.name }}</small>
            </span>
            <span :tabindex="hasChildren ? 0 : null"
               :role="hasChildren ? 'button' : null"
               @keypress.space.prevent="setExpanded( !expanded, $event.shiftKey )"
               @click.stop.prevent="setExpanded( !expanded, $event.shiftKey )"
               @selectstart.prevent
               class="sb-item-type">
               {{ item.type }}
               <i v-if="hasChildren"
                  :class="{ fa: true, 'fa-plus-square': !expanded, 'fa-minus-square': expanded }"></i>
            </span>
            <div class="meter"
               :class="{ full: !!result }"
               :style="{ width: result ? null : `${(view.progress[ item.$id ] || 0 ) * 100}%` }"></div>
         </h4>
      </div>

      <div v-if="expanded">
         <ul v-for="item in item.items"
            :key="item.name"
            class="sb-item-children">
            <li>
               <scenario-browser-item-control
                  :item="item"
                  :view="view"
                  :settings="settings"
                  @modify-expanded="$emit( 'modify-expanded', $event )"
                  @select="$emit( 'select', $event )"
                  @highlight="settings.activationEnabled && $emit( 'highlight', $event )"
                  @activate="settings.activationEnabled && $emit( 'activate', $event )" />
            </li>
         </ul>
      </div>
   </div>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

import Vue from 'vue';
import Tooltip from 'vue-directive-tooltip';
Vue.use( Tooltip );

export default {
   name: 'scenario-browser-item-control',
   props: {
      item: {
         type: Object,
         required: true
      },
      view: {
         type: Object,
         default: {
            progress: {},
            busySet: {},
            highlightSet: {},
            staleSet: {},
            results: {}
         }
      },
      settings: {
         type: Object,
         default: {
            activationEnabled: false,
            hiddenTypeSet: {},
            hiddenRoleSet: {},
            expandedSet: {}
         }
      }
   },
   computed: {
      hidden() {
         const { context: { role = 'test' } } = this.item;
         const { hiddenTypeSet, hiddenRoleSet } = this.settings;
         return this.item.type in hiddenTypeSet || role in hiddenRoleSet;
      },
      expanded() {
         const { $id } = this.item;
         const expanded = $id in this.settings.expandedSet;
         return expanded;
      },
      hasChildren() {
         return this.item.items && this.item.items.length;
      },
      result() {
         return this.view.results[ this.item.$id ];
      },
      inProgress() {
         const { busySet, progress } = this.view;
         const { $id } = this.item;
         return busySet[ $id ] && progress[ $id ] > 0;
      },
      statusClasses() {
         const { busySet, highlightSet, staleSet, results, progress } = this.view;
         const { $id, context: { role = 'test' } } = this.item;
         const { outcome = 'UNKNOWN' } = this.view.results[ this.item.$id ] || {};
         return {
            'sb-activation-enabled': this.settings.activationEnabled,
            'sb-highlight': highlightSet[ $id ],
            'sb-busy': busySet[ $id ],
            'sb-progress': busySet[ $id ] && progress[ $id ] > 0,
            [ `sb-outcome-${outcome.toLowerCase()}` ]: true,
            [ `sb-role-${role}` ]: true,
            'sb-result-stale': staleSet[ $id ],
            'sb-result-available': !!results[ $id ]
         };
      }
   },
   methods: {
      focusNext( $event ) {
         focusNeighborItem( $event.srcElement, 1 );
      },
      focusPrevious( $event ) {
         focusNeighborItem( $event.srcElement, -1 );
      },
      setExpanded( newExpanded, recursive = false ) {
         this.$emit( 'modify-expanded', { item: this.item, newExpanded, recursive } );
      }
   }
};

function focusNeighborItem( self, direction = 1 ) {
   const candidates = document.querySelectorAll( '.sb-item-description-text' );
   for( let i = 0; i < candidates.length; ++i ) {
      if( candidates[ i ] === self ) {
         if( candidates[ i + direction ] ) {
            candidates[ i + direction ].focus();
         }
         return;
      }
   }
}
</script>
