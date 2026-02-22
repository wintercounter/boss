import React, { useEffect } from 'react'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import CodeBlock from '@theme/CodeBlock'
import { cn } from '@site/src/lib/utils'
import { Button } from '@site/src/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@site/src/components/ui/hover-card'
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react'
import HomepageFeatures from '@site/src/components/HomepageFeatures'
import StrategyMatrix from '@site/src/components/StrategyMatrix'
import { Highlighter } from '../components/ui/highlighter'

import videoBg from '@site/static/boss-text-bg-high.mp4'

const floatingShowcases = [
    {
        language: 'tsx',
        code: `const Card = $$.$({
  radius: 'lg',
  bg: 'surface'
});`,
        title: 'Prepared components',
        description: 'Styled-component-like prepared components.',
        tone: 'pink',
        style: { top: -150, left: -10 },
    },
    {
        language: 'tsx',
        code: `<$$
  padding={[3, 6]}
  float="left"
/>`,
        title: 'Style props',
        description: 'Full CSS spec support with Typed props.',
        tone: 'purple',
        style: { top: -200, left: 200 },
    },
    {
        language: 'html',
        code: `<div class="display:flex gap:12" />`,
        title: 'CSS-familiar className syntax',
        description: 'If you know CSS, you know Boss classNames.',
        tone: 'cyan',
        style: { top: 60, right: -280 },
    },
    {
        language: 'html',
        code: `<section className="
  mobile:grid-cols:4
  tablet:grid-cols-8
" />`,
        title: 'Breakpoints',
        description: 'Media queries, container queries, preferred color scheme.',
        tone: 'pink',
        style: { top: 0, left: -150 },
    },
    {
        language: 'tsx',
        code: `<$$ tokens={{ color: { brand: '#bd93f9' } }}>
  <$$.p color="brand">
    Brand colored
  </$$.p>
</$$>`,
        title: 'Token context',
        description: 'Theme Context capabilities through component level token overrides.',
        tone: 'purple',
        style: { top: -190, right: -20 },
    },
    {
        language: 'html',
        code: `<div class="hover:{color:brand;text-decoration:underline}" />`,
        title: 'Group selectors',
        description: 'Assign multiple styles using a single className.',
        tone: 'cyan',
        style: { bottom: -130, left: '50%', transform: 'translateX(-50%)' },
    },
    {
        language: 'html',
        code: `<div class="
  [&_.item]:color:red
  hover:[&_.item]:opacity:0.8
  [&_.item]:transition:all
" />`,
        title: 'Arbitrary selectors',
        description: 'Reach into complex DOM structures when needed.',
        tone: 'pink',
        style: { bottom: -60, left: -170 },
    },
    {
        language: 'tsx',
        code: `const button = $$.cv('button', {
  variants: {
    tone: {
      brand: 'bg:brand color:white',
      ghost: 'bg:transparent',
    },
  },
});`,
        title: 'Boss-aware helpers',
        description: 'Compose classNames, tokens and variants safely with helpers.',
        tone: 'purple',
        style: { right: -230, bottom: -130 },
    },
    {
        language: 'tsx',
        code: `<div
  className="color:red"
  background={bgColor}
/>`,
        title: 'Mix & Match',
        description: 'Use classNames in general, props for dynamic cases. (If you want to 😉)',
        tone: 'cyan',
        style: { top: 160, left: -250 },
    },
    {
        language: 'tsx',
        code: `<$$
  color="brand"
  borderRadius="md"
/>`,
        title: 'Typed tokens',
        description: 'Tokens with autocomplete and type safety.',
        tone: 'pink',
        style: { top: 150, right: -240 },
    },
    {
        language: 'tsx',
        code: `<div className="flex px:2" />
<$$ flex px={4} />`,
        title: 'Bosswind Plugin',
        description: 'Tailwind like className, props and shorthands.',
        tone: 'purple',
        style: { right: -200, top: -40 },
    },
    {
        language: 'php',
        code: `<?php echo '<input class="width:100% padding:4" />' ?>`,
        title: 'Any language',
        description: 'Use Boss CSS in any language that can output HTML.',
        tone: 'cyan',
        style: { bottom: -210, left: '50%', transform: 'translateX(-50%)' },
    },
]

const floatingToneClasses = {
    pink: 'border-pink-500/30 hover:border-pink-500/60 hover:shadow-[0_0_30px_rgba(233,52,198,0.3)]',
    purple: 'border-purple-500/30 hover:border-purple-500/60 hover:shadow-[0_0_30px_rgba(147,51,234,0.3)]',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-[0_0_30px_rgba(0,212,255,0.3)]',
}

const floatingToneGlow = {
    pink: 'from-pink-500/10 to-transparent',
    purple: 'from-purple-500/10 to-transparent',
    cyan: 'from-cyan-500/10 to-transparent',
}

const floatingToneText = {
    pink: 'text-pink-300',
    purple: 'text-purple-300',
    cyan: 'text-cyan-300',
}

function FloatingCode() {
    return floatingShowcases.map((snippet, index) => (
        <div key={index} className="absolute pointer-events-auto group hidden lg:block" style={snippet.style}>
            <div
                className="animate-float group-hover:[animation-play-state:paused]"
                style={{
                    animationDelay: `${index * 250}ms`,
                    animationDuration: '10s',
                }}
            >
                <HoverCard openDelay={200} closeDelay={0}>
                    <HoverCardTrigger asChild>
                        <div
                            className={cn(
                                'group relative bg-card/80 border rounded-xl p-2.5 transition-all duration-300 scale-[0.94] hover:scale-100',
                                floatingToneClasses[snippet.tone],
                            )}
                        >
                            <div
                                className={cn(
                                    'absolute inset-0 bg-gradient-to-br rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                                    floatingToneGlow[snippet.tone],
                                )}
                            />
                            <CodeBlock
                                language={snippet.language}
                                className={cn(
                                    'floating-code-block text-left relative z-10 pointer-events-none text-[15px] leading-snug !bg-transparent !border-0 !shadow-none !p-0 !m-0 !mb-0 [&_pre]:!bg-transparent [&_code]:!bg-transparent [&_pre]:!p-0 [&_code]:!p-0 [&>code]:!p-0 [&>pre]:!p-0 [&>pre]:!m-0 [&>pre>code]:!p-0 [&>pre>code]:!pb-0 [&_.codeBlockLines]:!p-0 [&_.codeBlockLines]:!pb-0 [&_code]:!pb-0',
                                )}
                            >
                                {snippet.code}
                            </CodeBlock>
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent
                        sideOffset={12}
                        className={cn(
                            'pointer-events-none w-64 rounded-xl border-white/15 bg-card/95 shadow-[0_12px_30px_rgba(0,0,0,0.45)] data-[state=closed]:animate-none! data-[state=closed]:transition-none!',
                            floatingToneClasses[snippet.tone],
                        )}
                    >
                        <div className={cn('text-sm font-semibold mb-1', floatingToneText[snippet.tone])}>
                            {snippet.title}
                        </div>
                        <div className="text-xs text-foreground/70 leading-relaxed">{snippet.description}</div>
                    </HoverCardContent>
                </HoverCard>
            </div>
        </div>
    ))
}

function HeroSection() {
    const { siteConfig } = useDocusaurusContext()

    return (
        <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden scroll-mt-24">
            <div className="relative z-10 text-center max-w-3xl mx-auto">
                <FloatingCode />
                <h1 className="relative font-heading text-6xl md:text-8xl font-bold leading-tight -mb-3">
                    <span className="sr-only">{siteConfig.title}</span>
                    <svg
                        className="w-full h-[120px]"
                        viewBox="0 0 1200 220"
                        role="img"
                        aria-label={siteConfig.title}
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <defs>
                            <mask id="boss-title-mask" x="0" y="0" width="100%" height="100%">
                                <rect width="100%" height="100%" fill="black" />
                                <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
                                    fontWeight="700"
                                    fontSize="160"
                                    letterSpacing="2"
                                    fill="white"
                                >
                                    {siteConfig.title}
                                </text>
                            </mask>
                        </defs>
                        <foreignObject width="100%" height="100%" mask="url(#boss-title-mask)">
                            <div xmlns="http://www.w3.org/1999/xhtml" className="w-full h-full">
                                <video
                                    className="w-full h-full object-cover"
                                    src={videoBg}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                />
                            </div>
                        </foreignObject>
                    </svg>
                    <span className="pointer-events-auto absolute right-[12%] top-[12%] md:right-[160px] md:top-0 flex">
                        <span className="group relative items-center flex">
                            <span
                                tabIndex={0}
                                aria-label="Beta. Not ready for production—and possibly never will be!"
                                className="font-sans text-[20px] font-bold text-white"
                            >
                                𝜷
                            </span>
                            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 w-60 -translate-x-1/2 rounded-lg border border-white/15 bg-black/90 px-3 py-2 text-xs font-medium text-white/90 opacity-0 shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition group-hover:opacity-100 group-focus-within:opacity-100">
                                Not ready for production—and possibly never will be!
                                <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-white/15 bg-black/90" />
                            </span>
                        </span>
                    </span>
                </h1>
                <p className="text-2xl md:text-3xl text-foreground/90 mb-4 font-light tracking-wide">
                    Polymorphic CSS-in-JS that adjusts to your needs.
                </p>
                <p className="text-lg md:text-xl text-foreground/60 mb-12 max-w-3xl mx-auto leading-relaxed">
                    Generate only what you use. Runtime or Zero-runtime output, classNames or style props, it's up to
                    you, you're the{' '}
                    <Highlighter action="underline" color="#e60076" strokeWidth={4}>
                        Bo$$
                    </Highlighter>
                    .
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button
                        asChild
                        size="lg"
                        className="group relative bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold shadow-[0_0_30px_rgba(233,52,198,0.3)] hover:shadow-[0_0_50px_rgba(233,52,198,0.5)] transition-all duration-300"
                    >
                        <Link to="/docs/getting-started/quick-start">
                            <Sparkles className="mr-2 h-5 w-5" />
                            <span className="relative z-10">Get Started</span>
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>

                    <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="border-2 border-white/60 bg-black/45 text-white hover:text-white hover:bg-black/65 hover:border-white/85 px-8 py-6 text-lg font-semibold shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur-[1px]"
                    >
                        <Link to="/playground">Launch Playground</Link>
                    </Button>
                </div>
            </div>

            <button
                type="button"
                onClick={() => {
                    const featureGrid = document.getElementById('feature-grid')
                    if (featureGrid) {
                        featureGrid.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-pink-300/80 hover:text-pink-200 transition bg-transparent border-0 p-0 cursor-pointer"
                aria-label="Scroll to feature grid"
            >
                <ChevronDown className="w-12 h-12" />
            </button>
        </section>
    )
}

export default function Home() {
    const { siteConfig } = useDocusaurusContext()

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined
        }

        let armed = (window.scrollY || document.documentElement.scrollTop) === 0
        let isAutoScrolling = false

        const handleScroll = () => {
            const currentScrollTop = window.scrollY || document.documentElement.scrollTop
            if (currentScrollTop === 0 && !isAutoScrolling) {
                armed = true
                return
            }

            if (armed && currentScrollTop > 0) {
                armed = false
                isAutoScrolling = true
                const featureGrid = document.getElementById('feature-grid')
                if (featureGrid) {
                    featureGrid.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                window.setTimeout(() => {
                    isAutoScrolling = false
                }, 800)
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll, { passive: true })
    }, [])
    return (
        <Layout
            title={`${siteConfig.title} documentation`}
            description="Boss CSS documentation and usage examples for the plugin-driven CSS-in-JS system."
            wrapperClassName="boss-homepage"
        >
            <div className="relative min-h-screen">
                <HeroSection />
                <HomepageFeatures />
                <StrategyMatrix />
            </div>
        </Layout>
    )
}
