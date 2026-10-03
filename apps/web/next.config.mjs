// O proxy de /api fica em src/app/api/[...caminho]/route.ts e lê API_INTERNAL_URL em runtime;
// rewrites daqui seriam fixados no build da imagem.
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          // Subconjunto da CSP que não depende dos scripts inline do Next: bloqueia embed, <base> e <object> injetados.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https://wa.me https://api.whatsapp.com" },
        ],
      },
    ];
  },
};

export default nextConfig;
