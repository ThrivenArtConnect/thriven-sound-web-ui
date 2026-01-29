/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the parent CLI modules
  transpilePackages: [],
  // Handle large file uploads
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
