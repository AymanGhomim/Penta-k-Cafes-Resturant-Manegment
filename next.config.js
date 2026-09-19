/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the dev server isolated from production builds. Running `build`
  // while `dev` is open must not delete the files the browser is using.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: {
    // Keep production builds stable on constrained CI/developer machines.
    cpus: 1,
  },
  images: {
    // Let Next resize and cache menu images instead of downloading full-size
    // Unsplash assets directly in the browser.
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.unsplash.com",
      },
    ],
  },
};

module.exports = nextConfig;
