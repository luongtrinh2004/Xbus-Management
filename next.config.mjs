/** @type {import('next').NextConfig} */

const nextConfig = {
  basePath: process.env.BASEPATH,
  serverExternalPackages: ["bullmq", "ioredis", "@valkey/valkey-glide"],

  redirects: async () => [
    { source: '/', destination: '/home', permanent: true, locale: false }
  ],
}

export default nextConfig
