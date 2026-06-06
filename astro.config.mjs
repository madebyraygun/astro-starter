import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import node from '@astrojs/node';
import keystatic from '@keystatic/astro';
import fontDownload from './integrations/font-download.js';

// Keystatic's admin needs SSR, so dev runs the template's server setup.
// Production builds skip the admin entirely: pure static output, no adapter,
// nothing of the CMS ships to the deployed site.
const skipKeystatic = Boolean(process.env.SKIP_KEYSTATIC);

export default defineConfig(
  skipKeystatic
    ? {
        output: 'static',
        integrations: [fontDownload(), react(), markdoc()],
      }
    : {
        output: 'server',
        adapter: node({ mode: 'standalone' }),
        integrations: [fontDownload(), react(), markdoc(), keystatic()],
      }
);
