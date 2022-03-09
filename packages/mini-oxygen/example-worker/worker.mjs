export default {
    async fetch(request, environment, context) {
      return new Response(JSON.stringify(environment), {
        headers: {"Content-Type": "application/json"}
      });
    }
  }