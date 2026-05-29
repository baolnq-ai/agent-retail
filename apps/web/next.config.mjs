const configuredDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', '*.trycloudflare.com', ...configuredDevOrigins],
  devIndicators: false,
};

export default nextConfig;
