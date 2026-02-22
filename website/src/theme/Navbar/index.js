import React from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import { useLocation } from '@docusaurus/router'
import { useNavbarMobileSidebar } from '@docusaurus/theme-common/internal'
import NavbarMobileSidebar from '@theme/Navbar/MobileSidebar'
import { Button } from '@site/src/components/ui/button'
import { Github, Menu, X } from 'lucide-react'
import MorphingLogo from '@site/src/components/MorphingLogo'

export default function Navbar() {
    const location = useLocation()
    const mobileSidebar = useNavbarMobileSidebar()

    React.useEffect(() => {
        if (mobileSidebar.shown) {
            mobileSidebar.toggle()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname])

    const navLinks = [
        { to: '/docs/getting-started/quick-start', label: 'Docs', hoverClass: 'hover:text-pink-400' },
        { to: '/playground', label: 'Playground', hoverClass: 'hover:text-purple-400' },
        // { to: '/blog', label: 'Blog', hoverClass: 'hover:text-cyan-400' },
        // { to: '/changelog', label: 'Changelog', hoverClass: 'hover:text-blue-400' },
    ]

    return (
        <nav
            className={clsx(
                'navbar navbar--custom navbar--fixed-top fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md',
                mobileSidebar.shown && 'navbar-sidebar--show',
            )}
        >
            <div className="boss-navbar-inner flex w-full items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4 md:gap-8">
                    <Link to="/" className="flex items-center gap-3">
                        <MorphingLogo className="block" />
                    </Link>

                    <div className="boss-navbar-desktop-links items-center gap-8">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`text-foreground/70 ${link.hoverClass} transition-colors font-medium`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                    <div className="boss-navbar-desktop-actions items-center gap-4">
                        <Button asChild variant="ghost" size="sm" className="text-foreground/60 hover:text-foreground">
                            <Link href="https://github.com/wintercounter/boss" target="_blank" rel="noreferrer">
                                <Github className="w-5 h-5 mr-2" />
                                <span className="hidden sm:inline">GitHub</span>
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold"
                        >
                            <Link to="/docs/getting-started/quick-start">Get Started</Link>
                        </Button>
                    </div>

                    <button
                        type="button"
                        aria-label={mobileSidebar.shown ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={mobileSidebar.shown}
                        className="boss-navbar-mobile-toggle inline-flex h-10 w-10 items-center justify-center rounded-xl border border-pink-400/35 bg-gradient-to-br from-purple-500/25 to-pink-500/25 text-foreground shadow-[0_10px_24px_rgba(124,77,255,0.22)] backdrop-blur transition-all hover:border-pink-300/55 hover:from-purple-500/35 hover:to-pink-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/70"
                        onClick={mobileSidebar.toggle}
                    >
                        {mobileSidebar.shown ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <div role="presentation" className="navbar-sidebar__backdrop" onClick={mobileSidebar.toggle} />
            <NavbarMobileSidebar />
        </nav>
    )
}
