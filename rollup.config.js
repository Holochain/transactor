// rollup.config.js for transaction.js
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'

export default {
  input: 'dna-src/transaction.js',
  output: {
    file: 'dna-tmp/transaction.js',
    format: 'iife',
    name: 'dna',
    footer: ';(function (glb) { for (let i in dna) { glb[i] = dna[i] } })((1, eval)("this"))'
  },
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true
    }),

    commonjs({
      include: 'node_modules/**',
      sourceMap: false
    })
  ]
}
