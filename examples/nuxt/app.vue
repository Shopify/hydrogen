<script setup lang="ts">
import { CartProvider } from "~/storefront/cart";
</script>

<template>
  <CartProvider>
    <div class="bg-white text-black">
      <Header />
      <NuxtPage />
      <Footer />
      <CartDrawer />
    </div>
  </CartProvider>
</template>
