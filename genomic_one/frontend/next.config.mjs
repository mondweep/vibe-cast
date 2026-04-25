/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Explicitly ensuring no prefixes are used
  basePath: '',
  assetPrefix: '',
};

export default nextConfig;
