$$.css({
  body: {
    margin: 30,
    background: 'hero',
  },
})

$$.Panel = $$.$({
  padding: 22,
  borderRadius: 'xl',
  backgroundColor: 'surface.800',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.700',
  boxShadow: 'soft',
})

$$.Card = $$.$({
  padding: 18,
  borderRadius: 'lg',
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

$$.Pill = $$.$({
  padding: [6, 12],
  borderRadius: 'pill',
  fontSize: 12,
  backgroundColor: 'surface.700',
  color: 'ink.200',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.600',
})

$$.Icon = $$.$({
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: 'icon',
  fontWeight: 450,
  fontSize: 18,
  lineHeight: 1,
  fontFeatureSettings: '"liga" 1',
})

$$.Metric = $$.$({
  padding: 14,
  borderRadius: 'md',
  backgroundColor: 'surface.900',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.700',
})

export default function App() {
  return (
    <$$
      minHeight="100vh"
      padding={36}
      fontFamily="brand"
      color="ink.200"
      display="flex"
      flexDirection="column"
      gap={28}
      at={{ 'mobile+': { padding: 24 } }}
    >
      <$$.header
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={24}
        at={{ device: { flexDirection: 'column', alignItems: 'stretch', gap: 18 } }}
      >
        <$$.div
          display="flex"
          flexDirection="column"
          gap={12}
          maxWidth={620}
          at={{ device: { maxWidth: '100%' } }}
        >
          <$$.span
            display="inline-flex"
            alignItems="center"
            gap={10}
            fontSize={12}
            letterSpacing="0.26em"
            textTransform="uppercase"
            color="ink.500"
          >
            <$$.Icon>auto_awesome</$$.Icon>
            Preview workspace
          </$$.span>
          <$$.h1
            margin={0}
            fontSize={38}
            lineHeight="1.02"
            at={{ device: { fontSize: 32, lineHeight: '1.08' } }}
          >
            Build a dark UI layout with a single file
          </$$.h1>
          <$$.p margin={0} color="ink.400" lineHeight={1.5}>
            Mix layout primitives, interactive states, and responsive tweaks without
            leaving the component. Edit the code to explore variations.
          </$$.p>
        </$$.div>
        <$$
          display="flex"
          alignItems="center"
          gap={8}
          padding={6}
          borderRadius={999}
          backgroundColor="surface.800"
          borderWidth={1}
          borderStyle="solid"
          borderColor="surface.700"
            at={{
            device: {
              alignSelf: 'stretch',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 10,
              padding: 0,
              backgroundColor: 'transparent',
              borderColor: 'transparent',
            },
          }}
        >
          <$$.button
            padding={[9, 16]}
            borderRadius={999}
            border="none"
            backgroundColor="accent.500"
            color="surface.900"
            fontWeight={600}
            cursor="pointer"
            display="inline-flex"
            alignItems="center"
            gap={8}
            hover={{ filter: 'brightness(0.95)' }}
            at={{ device: { width: '100%', justifyContent: 'center' } }}
          >
            <$$.Icon>rocket_launch</$$.Icon>
            Primary action
          </$$.button>
          <$$.button
            padding={[9, 16]}
            borderRadius={999}
            borderWidth={1}
            borderStyle="solid"
            borderColor="surface.600"
            backgroundColor="transparent"
            color="ink.200"
            fontWeight={500}
            cursor="pointer"
            display="inline-flex"
            alignItems="center"
            gap={8}
            hover={{ backgroundColor: 'surface.700' }}
            at={{ device: { width: '100%', justifyContent: 'center' } }}
          >
            <$$.Icon>tune</$$.Icon>
            Secondary
          </$$.button>
        </$$>
      </$$.header>

      <$$
        display="grid"
        gap={18}
        gridTemplateColumns={['repeat(auto-fit, minmax(', 220, ', 1fr))']}
        at={{ device: { gridTemplateColumns: '1fr' } }}
      >
        {[
          {
            title: 'Adaptive layout',
            body: 'Cards scale with grid rules and adjust on smaller screens.',
            icon: 'grid_view',
          },
          {
            title: 'Interactive states',
            body: 'Hover, focus, and active styles live next to the element.',
            icon: 'bolt',
          },
          {
            title: 'Polished depth',
            body: 'Layered gradients and soft shadows build hierarchy.',
            icon: 'layers',
          },
        ].map((card) => (
          <$$.Card key={card.title} display="flex" flexDirection="column" gap={10}>
            <$$.span display="inline-flex" alignItems="center" gap={10} color="accent.400">
              <$$.Icon>{card.icon}</$$.Icon>
              {card.title}
            </$$.span>
            <$$.p margin={0} color="ink.400" lineHeight={1.5}>
              {card.body}
            </$$.p>
          </$$.Card>
        ))}
      </$$>

      <$$
        display="grid"
        gap={18}
        gridTemplateColumns={['minmax(', 0, ', 1.2fr) minmax(', 0, ', 0.8fr)']}
        at={{ device: { gridTemplateColumns: '1fr' } }}
      >
        <$$.Panel display="flex" flexDirection="column" gap={16}>
          <$$.div display="flex" alignItems="center" justifyContent="space-between">
            <$$.h2 margin={0} fontSize={20}>
              Workflow snapshot
            </$$.h2>
            <$$.span
              padding={[4, 12]}
              borderRadius={999}
              fontSize={12}
              color="accent.400"
              backgroundColor="surface.700"
            >
              Live
            </$$.span>
          </$$.div>
          <$$.p margin={0} color="ink.400" lineHeight={1.5}>
            Compose sections with alignment, gaps, and typography. Nest responsive
            overrides in place and keep structure readable.
          </$$.p>
          <$$.div display="flex" flexWrap="wrap" gap={8}>
            {['Spacing', 'Typography', 'Grid', 'States', 'Responsive'].map((pill) => (
              <$$.Pill key={pill}>{pill}</$$.Pill>
            ))}
          </$$.div>
          <$$.input
            placeholder="Filter sections"
            padding={[10, 14]}
            borderRadius="md"
            borderWidth={1}
            borderStyle="solid"
            borderColor="surface.600"
            backgroundColor="surface.900"
            color="ink.200"
            focus={{
              outline: 'none',
              borderColor: 'accent.400',
              boxShadow: ['0 0 0 ', 3, ' color-mix(in srgb, ', 'accent.400', ' 20%, transparent)'],
            }}
          />
        </$$.Panel>

        <$$.Panel display="flex" flexDirection="column" gap={16}>
          <$$.h2 margin={0} fontSize={20}>
            Live signals
          </$$.h2>
          <$$
            display="grid"
            gap={12}
            gridTemplateColumns={['repeat(auto-fit, minmax(', 120, ', 1fr))']}
          >
            {[
              { label: 'Latency', value: '42ms' },
              { label: 'CPU', value: '18%' },
              { label: 'Memory', value: '512MB' },
              { label: 'FPS', value: '60' },
            ].map((stat) => (
              <$$.Metric key={stat.label}>
                <$$.span fontSize={12} color="ink.500">
                  {stat.label}
                </$$.span>
                <$$.div fontSize={20} fontWeight={600}>
                  {stat.value}
                </$$.div>
              </$$.Metric>
            ))}
          </$$>
          <$$.div display="flex" gap={10}>
            <$$.Pill>Realtime</$$.Pill>
            <$$.Pill>Stable</$$.Pill>
            <$$.Pill>Optimized</$$.Pill>
          </$$.div>
        </$$.Panel>
      </$$>
    </$$>
  );
}
