#!/usr/bin/env node
import { execSync } from 'child_process';
import { globSync } from 'glob';

(() => {
  const mdFiles = globSync('**/*.md', {
    ignore: [
      '**/node_modules/**',
      'apps/docs/src/api/**', // generated api
      '**/CHANGELOG.md',
      'apps/demo-nextjs/**',
      'apps/demo-react-cra/**',
      'apps/demo-react-vite/**',
      'templates/**',
    ],
  });

  execSync(`pnpm textlint ${mdFiles.join(' ')} --parallel --debug`, { stdio: 'inherit' });
})();
