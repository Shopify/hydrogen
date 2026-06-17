<script setup lang="ts">
import { provideCartStore } from "~/storefront/cart";

provideCartStore();
</script>

<template>
  <div class="bg-white text-black">
    <Header />
    <NuxtPage />
    <Footer />
    <CartDrawer />
  </div>
</template>
