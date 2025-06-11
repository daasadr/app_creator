/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "undici": false,
        "net": false,
        "tls": false,
        "fs": false,
        "dns": false,
        "child_process": false,
        "worker_threads": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig; 