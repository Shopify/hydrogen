#!/usr/bin/env node

/**
 * Quick MCP Endpoint Validator
 * 
 * Tests the MCP route with real requests to verify:
 * - Tools list works
 * - Product search works
 * - Cart creation works
 * - Cart updates work
 * - Policy search works
 * 
 * Usage: node validate-mcp.mjs [endpoint-url]
 * Example: node validate-mcp.mjs http://localhost:3000/api/mcp
 */

const MCP_ENDPOINT = process.argv[2] || 'http://localhost:3000/api/mcp';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

let testsPassed = 0;
let testsFailed = 0;

async function testEndpoint(name, requestBody, validator) {
  try {
    process.stdout.write(`${colors.blue}Testing ${name}...${colors.reset} `);
    
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`JSON-RPC Error: ${result.error.message}`);
    }

    await validator(result);
    
    console.log(`${colors.green}✓ PASS${colors.reset}`);
    testsPassed++;
  } catch (error) {
    console.log(`${colors.red}✗ FAIL${colors.reset}`);
    console.error(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    testsFailed++;
  }
}

async function main() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   MCP Endpoint Validator${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);
  console.log(`Endpoint: ${MCP_ENDPOINT}\n`);

  // Test 1: Tools List
  await testEndpoint(
    'tools/list',
    {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1,
    },
    (result) => {
      if (!result.result || !result.result.tools) {
        throw new Error('Missing result.tools');
      }
      const tools = result.result.tools;
      if (tools.length !== 4) {
        throw new Error(`Expected 4 tools, got ${tools.length}`);
      }
      const toolNames = tools.map(t => t.name);
      const expected = ['search_shop_catalog', 'search_shop_policies_and_faqs', 'get_cart', 'update_cart'];
      for (const name of expected) {
        if (!toolNames.includes(name)) {
          throw new Error(`Missing tool: ${name}`);
        }
      }
      console.log(`    Found ${tools.length} tools: ${toolNames.join(', ')}`);
    }
  );

  // Test 2: Product Search
  let firstProduct = null;
  await testEndpoint(
    'search_shop_catalog',
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 2,
      params: {
        name: 'search_shop_catalog',
        arguments: { query: 'product', context: 'looking for items' }
      }
    },
    (result) => {
      if (!result.result || !result.result.content || !result.result.content[0]) {
        throw new Error('Missing result.content');
      }
      const text = result.result.content[0].text;
      const products = JSON.parse(text);
      
      if (!Array.isArray(products)) {
        throw new Error('Products is not an array');
      }
      
      console.log(`    Found ${products.length} products`);
      
      if (products.length > 0) {
        firstProduct = products[0];
        console.log(`    First product: ${firstProduct.name}`);
        
        // Validate product structure
        if (!firstProduct.variant_id) {
          throw new Error('Product missing variant_id');
        }
        if (firstProduct.available === undefined) {
          throw new Error('Product missing available field');
        }
        if (firstProduct.url === undefined) {
          throw new Error('Product missing url field');
        }
        if (firstProduct.image_url === undefined) {
          throw new Error('Product missing image_url field');
        }
        
        console.log(`    ✓ Product has all required fields`);
      }
    }
  );

  // Test 3: Cart Creation
  let cartId = null;
  if (firstProduct) {
    await testEndpoint(
      'update_cart (create)',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 3,
        params: {
          name: 'update_cart',
          arguments: {
            lines: [{
              merchandise_id: firstProduct.variant_id,
              quantity: 1
            }]
          }
        }
      },
      (result) => {
        if (!result.result || !result.result.content || !result.result.content[0]) {
          throw new Error('Missing result.content');
        }
        const text = result.result.content[0].text;
        const cart = JSON.parse(text);
        
        if (!cart || !cart.id) {
          throw new Error('Cart missing id');
        }
        
        cartId = cart.id;
        console.log(`    Created cart: ${cartId}`);
        console.log(`    Checkout URL: ${cart.checkoutUrl || 'N/A'}`);
      }
    );
  } else {
    console.log(`${colors.yellow}⊘ SKIP${colors.reset} update_cart (create) - No products found`);
  }

  // Test 4: Add to Existing Cart
  if (cartId && firstProduct) {
    await testEndpoint(
      'update_cart (add)',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 4,
        params: {
          name: 'update_cart',
          arguments: {
            cart_id: cartId,
            lines: [{
              merchandise_id: firstProduct.variant_id,
              quantity: 2
            }]
          }
        }
      },
      (result) => {
        if (!result.result || !result.result.content) {
          throw new Error('Missing result.content');
        }
        console.log(`    Added items to cart ${cartId}`);
      }
    );
  } else {
    console.log(`${colors.yellow}⊘ SKIP${colors.reset} update_cart (add) - No cart created`);
  }

  // Test 5: Get Cart
  if (cartId) {
    await testEndpoint(
      'get_cart',
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 5,
        params: {
          name: 'get_cart',
          arguments: { cart_id: cartId }
        }
      },
      (result) => {
        if (!result.result || !result.result.content || !result.result.content[0]) {
          throw new Error('Missing result.content');
        }
        const text = result.result.content[0].text;
        const cart = JSON.parse(text);
        
        if (!cart) {
          throw new Error('Cart is null');
        }
        
        console.log(`    Retrieved cart with ${cart.lines?.nodes?.length || 0} line items`);
      }
    );
  } else {
    console.log(`${colors.yellow}⊘ SKIP${colors.reset} get_cart - No cart created`);
  }

  // Test 6: Policy Search
  await testEndpoint(
    'search_shop_policies_and_faqs',
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 6,
      params: {
        name: 'search_shop_policies_and_faqs',
        arguments: { query: 'What is your return policy?' }
      }
    },
    (result) => {
      if (!result.result || !result.result.content || !result.result.content[0]) {
        throw new Error('Missing result.content');
      }
      const text = result.result.content[0].text;
      const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
      console.log(`    Policy text: ${preview}`);
    }
  );

  // Test 7: Input Validation
  await testEndpoint(
    'input validation (empty query)',
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 7,
      params: {
        name: 'search_shop_catalog',
        arguments: { query: '', context: 'test' }
      }
    },
    (result) => {
      if (!result.error) {
        throw new Error('Expected error for empty query, got success');
      }
      if (!result.error.message.includes('non-empty string')) {
        throw new Error(`Wrong error message: ${result.error.message}`);
      }
      console.log(`    ✓ Correctly rejected empty query`);
    }
  );

  // Test 8: Input Validation - Long Query
  await testEndpoint(
    'input validation (long query)',
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 8,
      params: {
        name: 'search_shop_catalog',
        arguments: { query: 'a'.repeat(501), context: 'test' }
      }
    },
    (result) => {
      if (!result.error) {
        throw new Error('Expected error for long query, got success');
      }
      if (!result.error.message.includes('500 characters')) {
        throw new Error(`Wrong error message: ${result.error.message}`);
      }
      console.log(`    ✓ Correctly rejected query over 500 chars`);
    }
  );

  // Test 9: Input Validation - Negative Quantity
  await testEndpoint(
    'input validation (negative quantity)',
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 9,
      params: {
        name: 'update_cart',
        arguments: {
          lines: [{ merchandise_id: 'gid://shopify/ProductVariant/123', quantity: -1 }]
        }
      }
    },
    (result) => {
      if (!result.error) {
        throw new Error('Expected error for negative quantity, got success');
      }
      if (!result.error.message.includes('non-negative')) {
        throw new Error(`Wrong error message: ${result.error.message}`);
      }
      console.log(`    ✓ Correctly rejected negative quantity`);
    }
  );

  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`   Results`);
  console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);
  console.log(`${colors.green}✓ Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${testsFailed}${colors.reset}`);
  
  if (testsFailed === 0) {
    console.log(`\n${colors.green}✅ All tests passed! Your MCP endpoint is working correctly.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Some tests failed. Please review the errors above.${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error.message);
  console.error(`\nMake sure your dev server is running at ${MCP_ENDPOINT}`);
  process.exit(1);
});
