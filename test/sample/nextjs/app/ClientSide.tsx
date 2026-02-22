'use client'

import React from 'react'

$$.PreparedUppercaseA = $$.$({
    color: 'lime',
})

export default function ClientSide() {
    return (
        <>
            <$$ textTransform={'uppercase'}>Client side: first time import</$$>
            <$$.PreparedUppercaseA>Client side: PreparedUppercaseA component (lime)</$$.PreparedUppercaseA>
        </>
    )
}
