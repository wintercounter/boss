import React from 'react'
import Link from '@docusaurus/Link'
import { translate } from '@docusaurus/Translate'
import { useNavbarMobileSidebar } from '@docusaurus/theme-common/internal'
import IconClose from '@theme/Icon/Close'
import MorphingLogo from '@site/src/components/MorphingLogo'

function CloseButton() {
    const mobileSidebar = useNavbarMobileSidebar()
    return (
        <button
            type="button"
            aria-label={translate({
                id: 'theme.docs.sidebar.closeSidebarButtonAriaLabel',
                message: 'Close navigation bar',
                description: 'The ARIA label for close button of mobile sidebar',
            })}
            className="clean-btn navbar-sidebar__close"
            onClick={() => mobileSidebar.toggle()}
        >
            <IconClose color="currentColor" />
        </button>
    )
}

export default function NavbarMobileSidebarHeader() {
    return (
        <div className="navbar-sidebar__brand boss-navbar-sidebar__brand">
            <Link to="/" className="boss-navbar-sidebar__logo-link" aria-label="Boss CSS home">
                <MorphingLogo className="block" />
            </Link>
            <CloseButton />
        </div>
    )
}
