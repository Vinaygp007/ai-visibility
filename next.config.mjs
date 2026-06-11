/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["firebase-admin"],
  async redirects() {
    return [
      { source: "/settings", destination: "/admin", permanent: true },
    ];
  },
};

export default nextConfig;
