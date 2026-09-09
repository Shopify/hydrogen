<script setup lang="ts">
import { PredictiveSearchProvider } from "~/storefront/predictive-search";

const PREDICTIVE_SEARCH_LIMIT = 5;
</script>

<template>
  <PredictiveSearchProvider :limit="PREDICTIVE_SEARCH_LIMIT">
    <PredictiveSearchCombobox />
  </PredictiveSearchProvider>
</template>
