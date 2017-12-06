<template>
   <table class="table ii-details-table">
      <colgroup>
         <col class="ii-details-label" ></col>
         <col class="ii-details-value" ></col>
         <col class="ii-details-expand" ></col>
      </colgroup>
      <tr v-for="(v, k) in value" :key="k" :class="{ 'ii-details-expanded': isExpanded[ k ] }">
         <th :title="k">{{ k }}</th>
         <td :title="v | preValue">
            <pre @dblclick="selectText" v-if="isExpanded[ k ]">{{ v | preValue }}</pre>
            <tt v-else>{{ v | ttValue }}</tt>
         </td>
         <td>
            <i class="fa fa-plus-circle" @click="toggleExpand( k )"></i>
         </td>
      </tr>
   </table>
</template>

<script>
/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * https://github.com/aixigo/arestocats/blob/master/LICENSE
 */

export default {
   props: {
      value: {
         type: Object
      }
   },
   data: () => ({
      isExpanded: {}
   }),
   methods: {
      toggleExpand( k ) {
         const newValue = !this.isExpanded[ k ];
         this.$set( this.isExpanded, k, newValue );
      },
      selectText( $event ) {
         selectText( $event.target );
      }
   },
   filters: {
      ttValue: v => typeof v === 'string' ? v : JSON.stringify( v ),
      preValue: v => typeof v === 'string' ? v : JSON.stringify( v, null, 3 )
   }
};

function selectText( element ) {
   if( document.body.createTextRange ) {
      const range = document.body.createTextRange();
      range.moveToElementText( element );
      range.select();
   }
   else if( window.getSelection ) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents( element );
      selection.removeAllRanges();
      selection.addRange( range );
   }
}

</script>
