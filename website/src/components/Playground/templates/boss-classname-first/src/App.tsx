import { useState } from 'react'

$$.css({
  body: {
    margin: 0,
    background: 'hero',
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
})

$$.Toggle = $$.$({
  padding: [9, 16],
  borderRadius: 999,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.600',
  backgroundColor: 'surface.900',
  color: 'ink.200',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  hover: {
    borderColor: 'accent.400',
  },
})

export default function App() {
  const [highlight, setHighlight] = useState(false)

  return (
    <$$
      minHeight="100vh"
      padding={32}
      fontFamily="brand"
      color="ink.100"
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
          Classname-first strategy
        </$$.span>
        <$$.h1 margin={0} fontSize={36} lineHeight="1.1">
          Static props become classes, dynamic props use functions
        </$$.h1>
        <$$.p margin={0} color="ink.400" lineHeight={1.6}>
          Toggle the state below. Notice the dynamic values are passed as functions so
          classname-first can emit CSS variables only when needed.
        </$$.p>
      </$$.header>

      <$$.Card
        display="flex"
        flexDirection="column"
        gap={16}
        borderColor={() =>
          highlight ? $$.token.color.accent[400] : $$.token.color.surface[700]
        }
        boxShadow={() => (highlight ? $$.token.boxShadow.lift : $$.token.boxShadow.soft)}
        transform={() => (highlight ? 'translateY(-4px)' : 'translateY(0)')}
      >
        <$$.strong fontSize={18}>Dynamic values (function form)</$$.strong>
        <$$.p margin={0} color="ink.400" lineHeight={1.5}>
          borderColor, boxShadow, and transform are dynamic, so they use functions.
        </$$.p>
        <$$ display="flex" gap={12} alignItems="center">
          <$$.Toggle onClick={() => setHighlight(value => !value)}>
            {highlight ? 'Disable highlight' : 'Enable highlight'}
          </$$.Toggle>
          <$$.span color="ink.400" fontSize={13}>
            Dynamic state is {highlight ? 'active' : 'idle'}
          </$$.span>
        </$$>
      </$$.Card>

      <$$ display="grid" gap={16} gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))">
        {[
          {
            title: 'Static values = classes',
            body: 'Static props generate predictable class output.',
          },
          {
            title: 'Functions for dynamics',
            body: 'Only function values become CSS variables.',
          },
          {
            title: 'Still ergonomic',
            body: 'You keep the Boss prop syntax, just add functions for dynamics.',
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
