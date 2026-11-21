/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/:file(icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png)", headers: [{ key: "Cache-Control", value: "public, max-age=604800, immutable" }] },
    ];
  },
};
