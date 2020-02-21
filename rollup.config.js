export default {
  external: ['bowser/src/bowser'],
  input: 'src/index.js',
  output: [
    {
      file: 'dist/metamask-onboarding.cjs.js',
      format: 'cjs',
    },
  ],
}
