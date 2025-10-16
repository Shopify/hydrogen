async function generateProjectUuid(root) {
  const encoder = new TextEncoder();
  const data = encoder.encode(root);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hashHex.slice(0, 8),
    hashHex.slice(8, 12),
    "4" + hashHex.slice(13, 16),
    // Version 4
    (parseInt(hashHex.slice(16, 18), 16) & 63 | 128).toString(16) + hashHex.slice(18, 20),
    // Variant bits
    hashHex.slice(20, 32)
  ].join("-");
}
async function loader({ request, context }) {
  let root = context?.env?.HYDROGEN_PROJECT_ROOT || "/workspace/hydrogen-dev";
  root = root.replace(/\\/g, "/");
  const uuid = await generateProjectUuid(root);
  const responseData = {
    workspace: {
      root,
      uuid
    }
  };
  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  });
}
export {
  loader
};
