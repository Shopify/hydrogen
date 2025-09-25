// This file extends the Hydrogen types for this project
// The types are automatically available via @shopify/hydrogen/react-router-types

// Extend the session data for your app
declare module 'react-router' {
  interface SessionData {
    customerAccessToken?: string;
    cartId?: string;
  }
}

// Extend the environment variables for your app
declare global {
  interface Env {
    // Your custom environment variables
    SOME_API_KEY?: string;
  }
}

// Add additional context properties if needed
declare global {
  interface HydrogenAdditionalContext {
    // Add any custom context properties your app needs
    // For example:
    // cms?: CMSClient;
  }
}

// Required to make this file a module and enable the augmentation
export {};
