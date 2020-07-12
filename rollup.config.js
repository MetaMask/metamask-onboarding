import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const config = [
  {
    external: ['bowser'],
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/metamask-onboarding.cjs.js',
        format: 'cjs',
      },
      {
        file: 'dist/metamask-onboarding.es.js',
        format: 'es',
      },
    ],
    plugins: [
      typescript(),
    ],
  }, {
    input: 'src/index.ts',
    output: [{
      file: 'dist/metamask-onboarding.bundle.js',
      format: 'iife',
      name: 'MetaMaskOnboarding',
    }],
    plugins: [
      typescript(),
      resolve(),
      commonjs({
        namedExports: {
          'bowser': ['parse'],
        },
      }),
    ],
  }];

export default config;
