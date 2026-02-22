import React from 'react'
import { ArrowDown, ArrowUp, Check, Minus, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const strategies = {
    'inline-first': [
        { feature: 'Build time CSS', value: 'yes' },
        { feature: 'Runtime CSS injection', value: 'no' },
        { feature: 'Runtime JS', value: 'yes' },
        { feature: 'Zero-runtime compile', value: 'yes' },
        { feature: 'JSX $$ authoring', value: 'yes' },
        { feature: 'className parsing', value: 'yes' },
        { feature: 'Non-JS / static HTML', value: 'yes' },
        { feature: 'Dynamic values', value: 'yes' },
        { feature: 'CSS file size', value: 'low' },
        { feature: 'Runtime cost', value: 'low' },
    ],
    'classname-first': [
        { feature: 'Build time CSS', value: 'yes' },
        { feature: 'Runtime CSS injection', value: 'no' },
        { feature: 'Runtime JS', value: 'yes' },
        { feature: 'Zero-runtime compile', value: 'yes' },
        { feature: 'JSX $$ authoring', value: 'yes' },
        { feature: 'className parsing', value: 'yes' },
        { feature: 'Non-JS / static HTML', value: 'yes' },
        { feature: 'Dynamic values', value: 'yes' },
        { feature: 'CSS file size', value: 'high' },
        { feature: 'Runtime cost', value: 'low' },
    ],
    'classname-only': [
        { feature: 'Build time CSS', value: 'yes' },
        { feature: 'Runtime CSS injection', value: 'no' },
        { feature: 'Runtime JS', value: 'no' },
        { feature: 'Zero-runtime compile', value: 'yes' },
        { feature: 'JSX $$ authoring', value: 'no' },
        { feature: 'className parsing', value: 'yes' },
        { feature: 'Non-JS / static HTML', value: 'yes' },
        { feature: 'Dynamic values', value: 'no' },
        { feature: 'CSS file size', value: 'high' },
        { feature: 'Runtime cost', value: 'low' },
    ],
    'runtime-only': [
        { feature: 'Build time CSS', value: 'no' },
        { feature: 'Runtime CSS injection', value: 'yes' },
        { feature: 'Runtime JS', value: 'yes' },
        { feature: 'Zero-runtime compile', value: 'no' },
        { feature: 'JSX $$ authoring', value: 'yes' },
        { feature: 'className parsing', value: 'no' },
        { feature: 'Non-JS / static HTML', value: 'no' },
        { feature: 'Dynamic values', value: 'yes' },
        { feature: 'CSS file size', value: 'none' },
        { feature: 'Runtime cost', value: 'high' },
    ],
    hybrid: [
        { feature: 'Build time CSS', value: 'yes' },
        { feature: 'Runtime CSS injection', value: 'yes' },
        { feature: 'Runtime JS', value: 'yes' },
        { feature: 'Zero-runtime compile', value: 'partial' },
        { feature: 'JSX $$ authoring', value: 'yes' },
        { feature: 'className parsing', value: 'yes' },
        { feature: 'Non-JS / static HTML', value: 'yes' },
        { feature: 'Dynamic values', value: 'yes' },
        { feature: 'CSS file size', value: 'low' },
        { feature: 'Runtime cost', value: 'high' },
    ],
}

const columns = [
    { key: 'inline-first', label: 'Inline-first', featured: true },
    { key: 'classname-first', label: 'Classname-first' },
    { key: 'classname-only', label: 'Classname-only' },
    { key: 'runtime-only', label: 'Runtime-only' },
    { key: 'hybrid', label: 'Hybrid' },
]

const featureOrder = strategies['inline-first'].map(item => item.feature)

function StatusIcon({ value }) {
    if (value === 'yes') return <Check className="w-5 h-5 text-green-400" />
    if (value === 'no') return <X className="w-5 h-5 text-red-400" />
    if (value === 'low') return <ArrowDown className="w-5 h-5 text-green-400" />
    if (value === 'high') return <ArrowUp className="w-5 h-5 text-red-400" />
    if (value === 'none') return <Minus className="w-5 h-5 text-foreground/40" />
    if (value === 'optional' || value === 'any' || value === 'partial') {
        return <Minus className="w-5 h-5 text-yellow-400" />
    }
    return <span className="text-sm text-foreground/60">{value}</span>
}

export default function StrategyMatrix() {
    return (
        <section className="py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-heading text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-500 to-pink-500 bg-clip-text text-transparent">
                        Choose Your Strategy
                    </h2>
                    <p className="text-xl text-foreground/60 max-w-3xl mx-auto leading-relaxed">
                        Boss CSS adapts to your needs. Pick the output strategy that fits your project.
                    </p>
                </div>
                <div>
                    <div className="overflow-x-auto pt-12">
                        <div className="min-w-[980px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <div className="relative">
                                <div className="grid border-b border-white/10 bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-cyan-500/20 rounded-t-xl [grid-template-columns:minmax(160px,1.1fr)_repeat(5,minmax(110px,1fr))] md:[grid-template-columns:minmax(200px,1.25fr)_repeat(5,minmax(140px,1fr))]">
                                    <div className="border-r rounded-tl-xl border-white/10 bg-slate-950/60 px-3 py-3 text-xs uppercase tracking-wider text-foreground/60 md:px-4 md:py-4 md:text-sm font-bold text-white">
                                        Features
                                    </div>
                                    {columns.map((column, i) => (
                                        <div
                                            key={column.key}
                                            className={`relative px-3 py-3 text-center text-xs font-semibold text-foreground/80 md:px-4 md:py-4 md:text-sm ${
                                                column.featured ? 'bg-white/10 text-white' : 'bg-white/[0.02]'
                                            }
                                            ${i === columns.length - 1 ? 'rounded-tr-xl' : ''}`}
                                        >
                                            {column.featured && (
                                                <span className="absolute bottom-full left-0 w-full rounded-t-md rounded-b-none bg-white/10 p-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white md:p-4 md:text-[10px]">
                                                    Default
                                                </span>
                                            )}
                                            <div className="flex flex-col items-center gap-1">
                                                <span>{column.label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-b-xl overflow-hidden">
                                    {featureOrder.map((feature, rowIndex) => (
                                        <div
                                            key={feature}
                                            className={`grid border-b border-white/5 last:border-b-0 ${
                                                rowIndex % 2 === 0 ? 'bg-white/[0.02]' : ''
                                            } [grid-template-columns:minmax(160px,1.1fr)_repeat(5,minmax(110px,1fr))] md:[grid-template-columns:minmax(200px,1.25fr)_repeat(5,minmax(140px,1fr))]`}
                                        >
                                            <div className="border-r border-white/5 bg-slate-950/60 px-3 py-3 text-sm font-medium text-foreground/80 md:px-4 md:py-4">
                                                {feature}
                                            </div>
                                            {columns.map(column => {
                                                const entry = strategies[column.key].find(
                                                    item => item.feature === feature,
                                                )
                                                const value = entry?.value ?? '-'
                                                const tooltipLabel = String(value).toUpperCase()
                                                return (
                                                    <Tooltip key={`${column.key}-${feature}`}>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className={`flex items-center justify-center px-3 py-3 md:px-4 md:py-4 ${
                                                                    column.featured ? 'bg-white/[0.03]' : ''
                                                                }`}
                                                            >
                                                                <StatusIcon value={value} />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            side="top"
                                                            align="center"
                                                            sideOffset={8}
                                                            hideArrow
                                                            className="rounded-full border border-white/10 bg-slate-950/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.4)]"
                                                        >
                                                            {tooltipLabel}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
