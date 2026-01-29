/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Handle large file uploads
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

export default nextConfig;
