import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
    // O proxy bufferiza o corpo das requisições e trunca em silêncio acima do limite
    // (padrão 10 MB). O upload da RF03 aceita arquivos de até 10 MB + overhead do multipart.
    proxyClientMaxBodySize: "12mb",
  },
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
