import React from 'react'
import Link from '@docusaurus/Link'
import { Github, Twitter, Diamond } from 'lucide-react'

const rootPackage = require('@site/../package.json')

export default function Footer() {
    const links = {
        docs: [
            { label: 'Quick Start', to: '/docs/getting-started/quick-start' },
            { label: 'Configuration', to: '/docs/getting-started/configuration' },
            { label: 'API Reference', to: '/docs/api/create-api' },
            { label: 'Migration Guide', to: '/docs/recipes/bosswind-migration' },
        ],
        build: [
            { label: 'Playground', to: '/playground' },
            { label: 'Runtime-only', to: '/docs/recipes/runtime-only' },
            { label: 'Server-first', to: '/docs/concepts/inline-first' },
        ],
        resources: [
            { label: 'Documentation', to: '/docs/getting-started/quick-start' },
            // { label: 'Blog', to: '/blog' },
            // { label: 'Changelog', to: '/changelog' },
            { label: 'GitHub', href: 'https://github.com/wintercounter/boss' },
        ],
    }

    return (
        <footer className="relative py-16 px-6 border-t border-white/10 bg-gradient-to-b from-transparent to-purple-950/20">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    <div className="md:col-span-1">
                        <div className="font-heading text-2xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
                                Boss CSS
                            </span>
                        </div>
                        <p className="text-foreground/60 text-sm leading-relaxed mb-6">
                            Polymorphic CSS-in-JS on your command.
                        </p>
                        <div className="flex gap-4">
                            <a
                                href="https://github.com/wintercounter/boss"
                                className="text-foreground/60 hover:text-pink-400 transition-colors"
                                aria-label="GitHub"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-heading font-semibold text-foreground mb-4">Docs</h4>
                        <ul className="space-y-3 list-none p-0 m-0">
                            {links.docs.map(link => (
                                <li key={link.label}>
                                    <Link
                                        to={link.to}
                                        className="text-foreground/60 hover:text-pink-400 transition-colors text-sm"
                                    >
                                        <span className="font-mono text-sm font-semibold text-pink-500/70 mr-2">
                                            $$
                                        </span>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-heading font-semibold text-foreground mb-4">Build</h4>
                        <ul className="space-y-3 list-none p-0 m-0">
                            {links.build.map(link => (
                                <li key={link.label}>
                                    <Link
                                        to={link.to}
                                        className="text-foreground/60 hover:text-purple-400 transition-colors text-sm"
                                    >
                                        <span className="font-mono text-sm font-semibold text-purple-500/70 mr-2">
                                            $$
                                        </span>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-heading font-semibold text-foreground mb-4">Resources</h4>
                        <ul className="space-y-3 list-none p-0 m-0">
                            {links.resources.map(link => (
                                <li key={link.label}>
                                    {link.href ? (
                                        <a
                                            href={link.href}
                                            className="text-foreground/60 hover:text-cyan-400 transition-colors text-sm"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <span className="font-mono text-sm font-semibold text-cyan-500/70 mr-2">
                                                $$
                                            </span>
                                            {link.label}
                                        </a>
                                    ) : (
                                        <Link
                                            to={link.to}
                                            className="text-foreground/60 hover:text-cyan-400 transition-colors text-sm"
                                        >
                                            <span className="font-mono text-sm font-semibold text-cyan-500/70 mr-2">
                                                $$
                                            </span>
                                            {link.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-foreground/40 text-sm font-mono">
                        <span className="text-pink-500">$</span> boss-css --version {rootPackage.version}
                    </p>
                    <p className="text-foreground/40 text-sm">Copyright © 2026 Boss CSS. MIT Licensed.</p>
                </div>
            </div>
        </footer>
    )
}
