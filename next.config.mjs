/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/(\\d{4})/:path",
        destination: "/:path",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
