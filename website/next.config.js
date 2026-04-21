/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
}

module.exports = nextConfig
