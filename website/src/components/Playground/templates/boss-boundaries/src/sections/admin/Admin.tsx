import './admin.boss.css'

$$.Panel = $$.$({
  padding: 20,
  borderRadius: 'xl',
  backgroundColor: 'surface.800',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.700',
  boxShadow: 'soft',
})

$$.Stat = $$.$({
  padding: 16,
  borderRadius: 'lg',
  backgroundColor: 'surface.900',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.700',
})

export default function Admin() {
  return (
    <$$ display="flex" flexDirection="column" gap={18}>
      <$$.Panel display="flex" flexDirection="column" gap={10}>
        <$$.h2 margin={0} fontSize={24}>
          Admin boundary
        </$$.h2>
        <$$.p margin={0} color="ink.400" lineHeight={1.6}>
          Admin UI styles live in a separate boundary file that loads with this chunk.
        </$$.p>
      </$$.Panel>

      <$$ display="grid" gap={16} gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))">
        {[
          { label: 'Active projects', value: '42' },
          { label: 'Review queue', value: '9' },
          { label: 'Latency', value: '120ms' },
        ].map(stat => (
          <$$.Stat key={stat.label} display="flex" flexDirection="column" gap={6}>
            <$$.span fontSize={12} color="ink.400" textTransform="uppercase" letterSpacing="0.12em">
              {stat.label}
            </$$.span>
            <$$.strong fontSize={22}>{stat.value}</$$.strong>
          </$$.Stat>
        ))}
      </$$>
    </$$>
  )
}
