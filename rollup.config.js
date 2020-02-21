import typescript from '@rollup/plugin-typescript';

export default {
  external: ['bowser'],
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/metamask-onboarding.cjs.js',
      format: 'cjs',
    },
  ],
  plugins: [
    typescript(),
  ],
};
