import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import node from '@astrojs/node';
import keystatic from '@keystatic/astro';
import fontDownload from './integrations/font-download.js';
import contentReload from './integrations/content-reload.js';

// Keystatic's admin needs SSR, so dev runs the template's server setup.
// Production builds skip the admin entirely: pure static output, no adapter,
// nothing of the CMS ships to the deployed site.
const skipKeystatic = Boolean(process.env.SKIP_KEYSTATIC);

export default defineConfig(
  skipKeystatic
    ? {
        output: 'static',
        devToolbar: { enabled: false },
        integrations: [fontDownload(), markdoc()],
      }
    : {
        output: 'server',
        devToolbar: { enabled: false },
        adapter: node({ mode: 'standalone' }),
        // Keystatic's admin lives at /keystatic and its client-side router
        // hardcodes that prefix, so the mount point can't be moved. Expose a
        // tool-agnostic /admin entry point that redirects to it instead.
        redirects: {
          '/admin': '/keystatic',
          '/admin/[...path]': '/keystatic/[...path]',
        },
        integrations: [fontDownload(), contentReload(), react(), markdoc(), keystatic()],
      }
);
