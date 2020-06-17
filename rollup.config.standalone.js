import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.ts',
  output: [{
    file: 'dist/metamask-onboarding.bundle.js',
    format: 'iife',
    name: 'MetamaskOnboarding',
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
};

