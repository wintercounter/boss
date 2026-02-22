import React, { useState } from 'react'

export default function MorphingLogo({ className = '' }) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            className={`relative flex items-center ${className}`.trim()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-all duration-500 ease-out"
            >
                <g className="transition-all duration-500">
                    <rect
                        x="8"
                        y="8"
                        width="24"
                        height="24"
                        rx={isHovered ? '12' : '4'}
                        fill="url(#logo-gradient-outer)"
                        className="transition-all duration-500"
                        opacity={isHovered ? '0.3' : '0.2'}
                    />

                    <rect
                        x="6"
                        y="6"
                        width="28"
                        height="28"
                        rx={isHovered ? '14' : '6'}
                        fill="none"
                        stroke="url(#logo-gradient-stroke)"
                        strokeWidth="1.5"
                        className="transition-all duration-500"
                        opacity={isHovered ? '0.6' : '0.4'}
                    />

                    <path
                        d="M14 12 L14 28 L22 28 C24.5 28 26.5 26 26.5 23.5 C26.5 21.8 25.5 20.3 24 19.7 C25 19 25.5 17.8 25.5 16.5 C25.5 14 23.5 12 21 12 Z M17 15 L20.5 15 C21.9 15 22.5 15.7 22.5 16.8 C22.5 17.9 21.9 18.5 20.5 18.5 L17 18.5 Z M17 21.5 L21 21.5 C22.4 21.5 23 22.2 23 23.3 C23 24.4 22.4 25 21 25 L17 25 Z"
                        fill="url(#logo-gradient-main)"
                        className="transition-all duration-500"
                    />
                </g>

                <defs>
                    <linearGradient id="logo-gradient-main" x1="14" y1="12" x2="26" y2="28">
                        <stop offset="0%" stopColor="#e934c6" />
                        <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                    <linearGradient id="logo-gradient-outer" x1="8" y1="8" x2="32" y2="32">
                        <stop offset="0%" stopColor="#e934c6" />
                        <stop offset="50%" stopColor="#9333ea" />
                        <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                    <linearGradient id="logo-gradient-stroke" x1="6" y1="6" x2="34" y2="34">
                        <stop offset="0%" stopColor="#e934c6" />
                        <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    )
}
