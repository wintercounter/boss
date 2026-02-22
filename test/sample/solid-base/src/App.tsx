import type { Component } from 'solid-js'

$$.Prepped = $$.$({
    color: 'red',
})

const App: Component = () => {
    return (
        <>
            <$$ color="blue">Hello world!!!!</$$>
            <$$.Prepped>Prepped</$$.Prepped>
        </>
    )
}

export default App
