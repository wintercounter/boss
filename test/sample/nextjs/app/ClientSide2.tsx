'use client'

export default function ClientSide2() {
    return (
        <>
            <$$ textTransform={'uppercase'}>Client side: using global</$$>
            <$$.PreparedUppercaseA>Client side: PreparedUppercaseA component (lime)</$$.PreparedUppercaseA>
        </>
    )
}
