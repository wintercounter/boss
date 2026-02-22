import React from 'react'
import clsx from 'clsx'
import { translate } from '@docusaurus/Translate'
import { ThemeClassNames } from '@docusaurus/theme-common'

const SHOW_THRESHOLD = 300

export default function BackToTopButton() {
    const [shown, setShown] = React.useState(false)

    React.useEffect(() => {
        const onScroll = () => {
            setShown(window.scrollY > SHOW_THRESHOLD)
        }

        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })

        return () => {
            window.removeEventListener('scroll', onScroll)
        }
    }, [])

    const scrollToTop = React.useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [])

    return (
        <button
            aria-label={translate({
                id: 'theme.BackToTopButton.buttonAriaLabel',
                message: 'Scroll back to top',
                description: 'The ARIA label for the back to top button',
            })}
            className={clsx('clean-btn', ThemeClassNames.common.backToTopButton, 'theme-back-to-top-button')}
            type="button"
            onClick={scrollToTop}
            style={{
                opacity: shown ? 1 : 0,
                pointerEvents: shown ? 'auto' : 'none',
                transform: shown ? 'translateY(0)' : 'translateY(8px)',
                visibility: shown ? 'visible' : 'hidden',
            }}
        />
    )
}
