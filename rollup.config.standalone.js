import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/metamask-onboarding.bundle.js',
    format: 'iife',
    name: 'MetamaskOnboarding'
  },
  plugins: [
    resolve()
  ]
}

