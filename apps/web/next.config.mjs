/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  trailingSlash: true,
  transpilePackages: ['@forex-journal/shared'],
};

export default config;
