import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Configuration } from '@rspack/core'
import ReactRefreshPlugin from '@rspack/plugin-react-refresh'
import bossPostcss from 'boss-css/postcss'

const root = path.dirname(fileURLToPath(import.meta.url))
const distRoot = path.resolve(root, '../../../dist/devtools-app')
const isDevServer = process.env.RSPACK_SERVE === 'true'

const output: Configuration['output'] = isDevServer
    ? {
          path: distRoot,
          filename: 'index.js',
          clean: false,
      }
    : {
          path: distRoot,
          filename: 'index.mjs',
          module: true,
          clean: true,
      }

const copyMonacoAssets = () => ({
    name: 'CopyMonacoAssets',
    apply(compiler: { hooks: { afterEmit: { tapPromise: (name: string, handler: () => Promise<void>) => void } } }) {
        compiler.hooks.afterEmit.tapPromise('CopyMonacoAssets', async () => {
            const source = path.resolve(root, 'node_modules/monaco-editor/min/vs')
            const target = path.resolve(distRoot, 'monaco/vs')
            try {
                await fs.mkdir(path.dirname(target), { recursive: true })
                await fs.cp(source, target, { recursive: true })
            } catch {
                // Asset copy is best-effort; dev server uses node_modules directly.
            }
        })
    },
})

const config: Configuration = {
    mode: isDevServer ? 'development' : 'production',
    target: 'web',
    entry: {
        index: path.resolve(root, isDevServer ? 'src/dev.tsx' : 'src/index.tsx'),
    },
    devtool: isDevServer ? 'cheap-module-source-map' : false,
    output,
    experiments: {
        outputModule: !isDevServer,
    },
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'builtin:swc-loader',
                    options: {
                        jsc: {
                            parser: {
                                syntax: 'typescript',
                                tsx: true,
                            },
                            transform: {
                                react: {
                                    runtime: 'automatic',
                                    refresh: isDevServer,
                                },
                            },
                        },
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [bossPostcss({ baseDir: root, dirDependencies: false })],
                            },
                        },
                    },
                ],
            },
        ],
    },
    plugins: isDevServer ? [new ReactRefreshPlugin()] : [copyMonacoAssets()],
    devServer: isDevServer
        ? {
              hot: true,
              static: {
                  directory: root,
              },
          }
        : undefined,
}

export default config
