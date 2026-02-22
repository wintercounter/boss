import { useState } from 'react'

$$.css({
  body: {
    margin: 0,
    background: 'surface.900',
  },
})

$$.Card = $$.$({
  padding: 22,
  borderRadius: 'xl',
  backgroundColor: 'surface.800',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.700',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
  hover: {
    transform: 'translateY(-4px)',
    borderColor: 'accent.400',
    boxShadow: 'lift',
  },
})

$$.Button = $$.$({
  padding: [9, 16],
  borderRadius: 999,
  border: 'none',
  backgroundColor: 'accent.500',
  color: 'surface.900',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  hover: { filter: 'brightness(0.95)' },
})

export default function App() {
  const [pulse, setPulse] = useState(false)

  return (
    <$$
      minHeight="100vh"
      padding={32}
      fontFamily="brand"
      color="ink.100"
      background="hero"
      display="flex"
      flexDirection="column"
      gap={24}
      at={{ device: { padding: 24 } }}
    >
      <$$.header display="flex" flexDirection="column" gap={12} maxWidth={640}>
        <$$.span
          display="inline-flex"
          alignItems="center"
          gap={10}
          fontSize={12}
          textTransform="uppercase"
          letterSpacing="0.2em"
          color="ink.500"
        >
          Runtime-only strategy
        </$$.span>
        <$$.h1 margin={0} fontSize={36} lineHeight="1.1">
          Client-side CSS injection
        </$$.h1>
        <$$.p margin={0} color="ink.400" lineHeight={1.6}>
          Runtime-only mode skips server CSS output and injects styles in the browser.
        </$$.p>
      </$$.header>

      <$$.Card
        display="flex"
        flexDirection="column"
        gap={14}
        borderColor={() => (pulse ? 'accent.400' : 'surface.700')}
        boxShadow={() => (pulse ? 'lift' : 'soft')}
      >
        <$$.strong fontSize={18}>Live runtime state</$$.strong>
        <$$.p margin={0} color="ink.400" lineHeight={1.5}>
          Toggle the state to see runtime-driven styles update instantly.
        </$$.p>
        <$$ display="flex" gap={12} alignItems="center">
          <$$.Button onClick={() => setPulse(value => !value)}>
            {pulse ? 'Disable pulse' : 'Enable pulse'}
          </$$.Button>
          <$$.span color="ink.400" fontSize={13}>
            Runtime state: {pulse ? 'active' : 'idle'}
          </$$.span>
        </$$>
      </$$.Card>

      <$$ display="grid" gap={16} gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))">
        {[
          {
            title: 'Client-only styles',
            body: 'CSS is injected in the browser instead of server output.',
          },
          {
            title: 'Dynamic tokens',
            body: 'Token values still resolve to CSS variables at runtime.',
          },
          {
            title: 'Keep the same API',
            body: 'Use the standard Boss prop syntax with runtime behavior.',
          },
        ].map(card => (
          <$$.Card key={card.title} display="flex" flexDirection="column" gap={10}>
            <$$.strong fontSize={16}>{card.title}</$$.strong>
            <$$.span color="ink.400" lineHeight={1.5}>
              {card.body}
            </$$.span>
          </$$.Card>
        ))}
      </$$>
    </$$>
  )
}
