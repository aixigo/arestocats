/**
* Copyright 2017 aixigo AG
*/
<template>
   <div>
      <h3 v-if="metrics.length">
         <i class="fa fa-thermometer-three-quarters" aria-hidden="true"></i>
         Metrics
      </h3>
      <table v-i="metrics.length"
             class="table table-striped">
         <thead v-if="metrics.length > 0">
            <tr>
               <th>Category</th>
               <th>Name</th>
               <th>Label</th>
               <th>Type</th>
               <th>Value</th>
            </tr>
         </thead>
         <tbody>
            <template v-for="categories in metrics">
               <tr v-for="(metric, index) in categories.metrics">
                  <td>{{ categories.category }}</td>
                  <td>{{ metric.name }}</td>
                  <td>{{ metric.label }}</td>
                  <td>{{ metric.metricType }}</td>
                  <td>{{ parseFloat( metric.value ).toFixed(2) }}</td>
               </tr>
            </template>
         </tbody>
      </table>
   </div>
</template>

<script>

import { resources  } from 'laxar-patterns';
import { navigation } from 'lib/util';

export default {
   data: () => ( {
      running: false,
      cancelling: false,
      metrics: [],
      resources: {
         metrics: {},
         job: {}
      }
   } ),
   created() {
      resources.handlerFor( this ).registerResourceFromFeature( 'metrics', { onReplace: () => {
         this.resources.metrics.forEach( m => {
            if( this.metrics.length && this.metrics[this.metrics.length - 1][ 'category' ]  == m[ 'category' ] ){
               this.metrics.pop();
            }
            this.metrics.push( m );
         } );
      } } );
      resources.handlerFor( this ).registerResourceFromFeature( 'job', { onReplace: () => {
         this.applyJobState();
      } } );
   },
   methods: {
      applyJobState() {
         const { job } = this.resources;
         this.metrics = [];
         this.running = job && !job.finished;
      }
   }
};
</script>
