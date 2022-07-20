import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';

const config = [
  {
    external: ['bowser'],
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/metamask-onboarding.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/metamask-onboarding.es.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [typescript()],
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/metamask-onboarding.bundle.js',
        format: 'iife',
        name: 'MetaMaskOnboarding',
      },
    ],
    plugins: [typescript(), resolve()],
  },
];

export default config;
