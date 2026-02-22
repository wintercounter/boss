import { component$ } from '@builder.io/qwik'
import type { DocumentHead } from '@builder.io/qwik-city'
import $$ from '~/.bo$$'

$$.Prepped = $$.$({
    color: 'red',
})

export default component$(() => {
    return (
        <>
            <$$ color="blue">Hello world!!!!</$$>
            <$$.Prepped>Prepped</$$.Prepped>
            <div class="color:pink">Classname</div>
        </>
    )
})

export const head: DocumentHead = {
    title: 'Welcome to Qwik',
    meta: [
        {
            name: 'description',
            content: 'Qwik site description',
        },
    ],
}
