export default {
    async fetch(request, environment, context) {
      if (new URL(request.url).pathname === '/html') {
        return new Response('<html><body>Hello, world</body>', {
          headers: {"Content-Type": "text/html"}
        });
      }

      return new Response(JSON.stringify(environment), {
        headers: {"Content-Type": "application/json"}
      });
    }
  }