import { render } from 'preact'

$$.Prepped = $$.$({
    color: 'red',
})

export function App() {
    return (
        <>
            <$$ color="blue">Hello world!!!!</$$>
            <$$.Prepped>Prepped</$$.Prepped>
        </>
    )
}

render(<App />, document.getElementById('app'))
