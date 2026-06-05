/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.optimumnutrition.co.in',
      },
    ],
  },
}

module.exports = nextConfig
