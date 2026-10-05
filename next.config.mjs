/** @type {import('next').NextConfig} */

const nextConfig = {
  basePath: process.env.BASEPATH,
  // The production VPS has 4 GB RAM. Keep static generation serial so a
  // deploy does not starve the running XBus and Plane containers.
  experimental: {
    cpus: Number(process.env.NEXT_BUILD_CPUS || 1),
  },
  serverExternalPackages: [
    "bullmq",
    "ioredis",
    "@valkey/valkey-glide",
    "@bull-board/api",
    "@bull-board/express",
    "express",
    "sharp",
    "heic-convert",
    "heic-decode",
    "libheif-js"
  ],

  rewrites: async () => ({
    beforeFiles: [],
    afterFiles: [],
    fallback: [],
  }),

  redirects: async () => [
    { source: '/', destination: '/home', permanent: true, locale: false },
    { source: '/bull-dash/:path*', destination: '/bull-board/:path*', permanent: false }
  ],
}

export default nextConfig
