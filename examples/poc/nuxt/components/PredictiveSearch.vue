<script setup lang="ts">
import { providePredictiveSearchStore } from "~/storefront/predictive-search";

const PREDICTIVE_SEARCH_LIMIT = 5;

providePredictiveSearchStore({ limit: PREDICTIVE_SEARCH_LIMIT });
</script>

<template>
  <PredictiveSearchCombobox />
</template>
