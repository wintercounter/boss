import './.bo$$'
import './.bo$$/styles.css'
import Boundary from './boundary/boundary.tsx'

$$.PreparedUppercaseA = $$.$({
    as: 'a',

    boxShadow: '0 0 0 2px currentColor',
    href: 'https://www.google.com',
    textTransform: 'uppercase',
    width: 300,
    hover: {
        color: 'purple',
    },

    at: {
        'mobile+': { color: 'cyan' },
    },
    before: {
        content: '""',
    },
    children: 'Prepared Uppercase Link',

    //onClick: () => {},
})

$$.PreparedDefault = $$.$({
    as: 'a',
    href: '',
    color: 'red',
    onClick: () => {},
    children: 'Default Link',
})

function App() {
    return (
        <$$ className="color:blue font-family:inter">
            hello
            <$$.PreparedUppercaseA />
            <Boundary />
        </$$>
    )
}

export default App
