import { lazy, Suspense, useState } from 'react'

const Marketing = lazy(() => import('./sections/marketing/Marketing'))
const Admin = lazy(() => import('./sections/admin/Admin'))

$$.css({
  body: {
    margin: 0,
    background: 'surface.900',
  },
})

$$.Shell = $$.$({
  minHeight: '100vh',
  padding: 32,
  fontFamily: 'brand',
  color: 'ink.100',
  background: 'hero',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
})

$$.Tabs = $$.$({
  display: 'inline-flex',
  gap: 10,
  padding: 6,
  borderRadius: 999,
  backgroundColor: 'surface.800',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.700',
})

$$.Tab = $$.$({
  padding: [8, 14],
  borderRadius: 999,
  border: 'none',
  backgroundColor: 'transparent',
  color: 'ink.200',
  fontWeight: 600,
  cursor: 'pointer',
})

$$.Card = $$.$({
  padding: 20,
  borderRadius: 'xl',
  backgroundColor: 'surface.800',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'surface.700',
})

export default function App() {
  const [section, setSection] = useState<'marketing' | 'admin'>('marketing')
  const activeTabStyles = { backgroundColor: 'accent.500', color: 'surface.900' }

  return (
    <$$.Shell at={{ device: { padding: 24 } }}>
      <$$.header display="flex" flexDirection="column" gap={12} maxWidth={720}>
        <$$.span
          display="inline-flex"
          alignItems="center"
          gap={10}
          fontSize={12}
          textTransform="uppercase"
          letterSpacing="0.2em"
          color="ink.500"
        >
          CSS boundaries
        </$$.span>
        <$$.h1 margin={0} fontSize={36} lineHeight="1.1">
          Split styles by feature with lazy-loaded sections
        </$$.h1>
        <$$.p margin={0} color="ink.400" lineHeight={1.6}>
          Each section imports its own `*.boss.css` boundary. Suspense loads the chunk
          and its CSS together.
        </$$.p>
      </$$.header>

      <$$.Tabs>
        <$$.Tab
          as="button"
          onClick={() => setSection('marketing')}
          {...(section === 'marketing' ? activeTabStyles : {})}
        >
          Marketing
        </$$.Tab>
        <$$.Tab
          as="button"
          onClick={() => setSection('admin')}
          {...(section === 'admin' ? activeTabStyles : {})}
        >
          Admin
        </$$.Tab>
      </$$.Tabs>

      <Suspense
        fallback={
          <$$.Card display="flex" flexDirection="column" gap={8}>
            <$$.strong fontSize={16}>Loading section…</$$.strong>
            <$$.span color="ink.400" lineHeight={1.5}>
              Boundary CSS will load with the component chunk.
            </$$.span>
          </$$.Card>
        }
      >
        {section === 'marketing' ? <Marketing /> : <Admin />}
      </Suspense>
    </$$.Shell>
  )
}
