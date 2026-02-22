import './marketing.boss.css'

$$.Card = $$.$({
  padding: 20,
  borderRadius: 'xl',
  backgroundColor: 'surface.800',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.700',
  boxShadow: 'soft',
})

$$.Badge = $$.$({
  padding: [4, 10],
  borderRadius: 'pill',
  fontSize: 12,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  backgroundColor: 'surface.700',
  color: 'ink.200',
})

export default function Marketing() {
  return (
    <$$ display="flex" flexDirection="column" gap={18}>
      <$$.Card display="flex" flexDirection="column" gap={12}>
        <$$.Badge>Marketing boundary</$$.Badge>
        <$$.h2 margin={0} fontSize={24}>
          Campaign highlights
        </$$.h2>
        <$$.p margin={0} color="ink.400" lineHeight={1.6}>
          This section imports its own boundary file, so CSS stays scoped to marketing.
        </$$.p>
      </$$.Card>

      <$$ display="grid" gap={16} gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))">
        {[
          {
            title: 'Audience insights',
            body: 'Track conversion and engagement with lightweight CSS.',
          },
          {
            title: 'Launch kits',
            body: 'Reusable panels and banners live inside this boundary.',
          },
          {
            title: 'Theme tokens',
            body: 'Shared tokens remain global while styles stay local.',
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
