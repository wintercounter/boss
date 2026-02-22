import React from 'react'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import { useThemeConfig } from '@docusaurus/theme-common'
import MorphingLogo from '@site/src/components/MorphingLogo'

export default function Logo(props) {
    const {
        navbar: { logo },
    } = useThemeConfig()
    const logoLink = useBaseUrl(logo?.href || '/')
    const { imageClassName, ...rest } = props
    delete rest.titleClassName

    return (
        <Link to={logoLink} {...rest} {...(logo?.target && { target: logo.target })}>
            <MorphingLogo className={imageClassName} />
        </Link>
    )
}
