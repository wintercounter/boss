import { cn } from '@site/src/lib/utils'
import {
    ArrowRightLeft,
    Bot,
    BookOpen,
    Braces,
    CheckCheck,
    Feather,
    FolderTree,
    Globe,
    Hammer,
    KeyRound,
    LetterText,
    Network,
    Package,
    Palette,
    Plug,
    Puzzle,
    RotateCcw,
    Shuffle,
    Sparkles,
    SquareStack,
    Target,
    Terminal,
    Type,
    Wand2,
    Wind,
    Wrench,
    ZapOff,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@site/src/components/ui/card'

const features = [
    {
        icon: Sparkles,
        title: 'Polymorphic output',
        description: 'Runtime, types, AI docs, all generated during development based on your usage and needs.',
        color: 'pink',
        size: 'xl',
    },
    {
        icon: ZapOff,
        title: 'Zero-runtime paths',
        description: 'Compile away or use classname-only strategy when you want zero runtime.',
        color: 'purple',
        size: 'medium',
    },
    {
        icon: Braces,
        title: 'CSS-familiar class name syntax',
        description: 'If you know CSS, you know Boss class names.',
        color: 'cyan',
        size: 'medium',
    },
    {
        icon: FolderTree,
        title: 'CSS boundaries',
        description: 'Split CSS by folder to reduce you critical CSS size.',
        color: 'purple',
        size: 'medium',
    },
    {
        icon: Wind,
        title: 'Bosswind mode',
        description: 'Tailwind-like prop and className shorthands.',
        color: 'cyan',
        size: 'small',
    },
    {
        icon: Shuffle,
        title: 'Multiple strategies',
        description: 'Inline-first, classname-first, runtime-only, classname-only or hybrid from one API.',
        color: 'pink',
        size: 'xl',
    },
    {
        icon: KeyRound,
        title: 'Global $$ API',
        description: 'A single powerful global proxy for components, tokens, and helpers.',
        color: 'pink',
        size: 'large',
    },
    {
        icon: Network,
        title: 'Nested contexts',
        description: 'Pseudo, at, child, and container queries in one syntax.',
        color: 'pink',
        size: 'small',
    },
    {
        icon: Type,
        title: 'Typed tokens',
        description: 'Token maps with typed global access.',
        color: 'purple',
        size: 'medium',
    },
    {
        icon: Puzzle,
        title: 'Plugin pipeline',
        description: 'Async event pipeline for server, runtime, and compile.',
        color: 'cyan',
        size: 'small',
    },
    {
        icon: Wrench,
        title: 'Devtools (React)',
        description:
            'Live inspection, prop modification, quick previews capable of saving your changes in your source file.',
        color: 'cyan',
        size: 'small',
    },
    {
        icon: Wand2,
        title: 'Boss-aware helpers',
        description: 'cx / cv / scv / sv for class name + style object composition and variants.',
        color: 'cyan',
        size: 'xl',
    },
    {
        icon: Bot,
        title: 'AI ready',
        description: 'Dynamically generated LLMS.md and skills support.',
        color: 'cyan',
        size: 'xl',
    },
    {
        icon: Hammer,
        title: 'Tooling-agnostic',
        description: 'PostCSS and/or CLI only, no bundler plugins required.',
        color: 'purple',
        size: 'medium',
    },
    {
        icon: Globe,
        title: 'Language-agnostic',
        description: "Class names work in any framework or language that's text based.",
        color: 'purple',
        size: 'medium',
    },
    {
        icon: Package,
        title: 'Prepared components',
        description: 'Styled-components-like prebuilt components.',
        color: 'purple',
        size: 'small',
    },
    {
        icon: SquareStack,
        title: 'Container queries',
        description: 'Container props + shorthands for responsive UI.',
        color: 'pink',
        size: 'small',
    },
    {
        icon: ArrowRightLeft,
        title: 'Compile transforms',
        description: 'SWC-based compiler to prune runtime and optimize selectors.',
        color: 'pink',
        size: 'large',
    },
    {
        icon: Feather,
        title: 'Lightweight runtime',
        description: "Runtime only manages class and style props, it doesn't create/manipulate style nodes.",
        color: 'pink',
        size: 'large',
    },
    {
        icon: Target,
        title: 'Arbitrary selectors',
        description: 'Selectors like `[&_.item]:color:red` when needed.',
        color: 'purple',
        size: 'small',
    },
    {
        icon: Palette,
        title: 'Token context',
        description: 'ThemeContext-like component-level token overrides for contextual theming.',
        color: 'cyan',
        size: 'small',
    },
    {
        icon: RotateCcw,
        title: 'CSS reset plugin',
        description: 'Optional reset shipped as a plugin for consistent base styles.',
        color: 'pink',
        size: 'small',
    },
    {
        icon: LetterText,
        title: 'Fontsource plugin',
        description: 'Built-in fontsource integration for font tokens.',
        color: 'purple',
        size: 'small',
    },
    {
        icon: Plug,
        title: 'Framework adapters',
        description: 'React, Preact, Solid, Qwik, and Stencil runtimes.',
        color: 'purple',
        size: 'large',
    },
    {
        icon: BookOpen,
        title: 'DTCG token support',
        description: 'Import your DTCG tokens (for example from Style Dictionary).',
        color: 'purple',
        size: 'large',
    },
    {
        icon: Terminal,
        title: 'CLI tools',
        description: 'init, watch, build, dev server, and more.',
        color: 'cyan',
        size: 'small',
    },
    {
        icon: CheckCheck,
        title: 'Linting + formatting',
        description: 'ESLint plugin for best practices and formatting.',
        color: 'pink',
        size: 'small',
    },
]

const colorClasses = {
    pink: {
        border: 'border-pink-500/30 hover:border-pink-500/60',
        glow: 'hover:shadow-[0_0_30px_rgba(233,52,198,0.3)]',
        icon: 'text-pink-400',
        gradient: 'from-pink-500/10 to-transparent',
    },
    purple: {
        border: 'border-purple-500/30 hover:border-purple-500/60',
        glow: 'hover:shadow-[0_0_30px_rgba(147,51,234,0.3)]',
        icon: 'text-purple-400',
        gradient: 'from-purple-500/10 to-transparent',
    },
    cyan: {
        border: 'border-cyan-500/30 hover:border-cyan-500/60',
        glow: 'hover:shadow-[0_0_30px_rgba(0,212,255,0.3)]',
        icon: 'text-cyan-400',
        gradient: 'from-cyan-500/10 to-transparent',
    },
}

const sizeClasses = {
    xl: 'md:col-span-2',
    large: 'md:col-span-2',
    medium: '',
    small: '',
}

export default function HomepageFeatures() {
    return (
        <section id="feature-grid" className="min-h-screen py-24 px-6 scroll-mt-24">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                    {features.map((feature, index) => {
                        const Icon = feature.icon
                        const colors = colorClasses[feature.color]
                        return (
                            <Card
                                key={`${feature.title}-${index}`}
                                className={cn(
                                    'group relative bg-card/50 backdrop-blur-sm border transition-all duration-300 hover:scale-[1.01]',
                                    colors.border,
                                    colors.glow,
                                    sizeClasses[feature.size],
                                    feature.className,
                                )}
                            >
                                <div
                                    className={cn(
                                        'absolute inset-0 bg-gradient-to-br rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                                        colors.gradient,
                                    )}
                                />
                                <CardHeader className="relative z-10">
                                    <Icon className={cn('w-9 h-9 mb-2', colors.icon)} />
                                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <CardDescription className="text-sm leading-relaxed">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
