import React from 'react'
import Layout from '@theme/Layout'
import BrowserOnly from '@docusaurus/BrowserOnly'
import styles from './playground.module.css'

const embedHeight = '100%'

export default function PlaygroundPage() {
    return (
        <Layout
            title="Playground"
            description="Boss CSS WebContainer playground."
            noFooter
            wrapperClassName="playground-page"
        >
            <main className={styles.main}>
                <div className={styles.shell}>
                    <BrowserOnly fallback={<div>Loading playground…</div>}>
                        {() => {
                            const Playground = require('@site/src/components/Playground').default
                            return (
                                <Playground
                                    height={embedHeight}
                                    view="default"
                                    lazy={false}
                                    showSidebar
                                    hideExplorer={false}
                                    hideNavigation={false}
                                />
                            )
                        }}
                    </BrowserOnly>
                </div>
            </main>
        </Layout>
    )
}
