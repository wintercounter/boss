const cx = $$.cx
const cv = $$.cv
const scv = $$.scv
const sv = $$.sv

$$.css({
  body: {
    margin: 0,
    background: 'hero',
  },
})

const badge = cv({
  base: 'display:inline-flex align-items:center gap:8 padding:6_12 border-radius:999 font-size:12 font-weight:600',
  variants: {
    tone: {
      accent: 'background-color:accent.500 color:surface.900',
      neutral: 'background-color:surface.700 color:ink.200',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
})

const featureCard = scv({
  slots: ['root', 'title', 'body', 'meta'],
  base: {
    root: 'padding:18 border-radius:lg background-color:surface.900 border-width:1 border-style:solid border-color:surface.700 display:flex flex-direction:column gap:10',
    title: 'font-weight:600 font-size:16',
    body: 'color:ink.400 line-height:1.5',
    meta: 'font-size:12 text-transform:uppercase letter-spacing:0.2em color:ink.500',
  },
  variants: {
    tone: {
      accent: {
        root: 'border-color:accent.400 box-shadow:lift',
        title: 'color:accent.300',
      },
      soft: {
        root: 'background-color:surface.800',
      },
    },
  },
})

const panel = sv({
  base: {
    padding: 22,
    borderRadius: 'xl',
    backgroundColor: 'surface.900',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'surface.700',
    display: 'grid',
    gap: 16,
  },
  variants: {
    glow: {
      on: {
        boxShadow: 'lift',
        borderColor: 'accent.400',
      },
    },
  },
})

const highlights = [
  {
    label: 'cx merge',
    body: 'Compose className strings with arrays, objects, and tokens.',
  },
  {
    label: 'cv variants',
    body: 'Build variant-aware className recipes for reusable UI.',
  },
  {
    label: 'sv styles',
    body: 'Merge style objects for structured props and overrides.',
  },
]

const panels = [
  {
    title: 'Utility-driven layout',
    body: 'Mix className tokens with prop objects without collisions.',
    tone: 'accent',
  },
  {
    title: 'Slot variants',
    body: 'scv keeps variants organized for multi-part components.',
    tone: 'soft',
  },
  {
    title: 'Style object merging',
    body: 'sv merges nested objects so overrides stay predictable.',
    tone: 'accent',
  },
]

export default function App() {
  const panelClasses = cx(
    'display:inline-flex align-items:center gap:10 font-size:12 text-transform:uppercase letter-spacing:0.24em',
    {
      'color:accent.300': true,
    },
  )

  const gridProps = panel({
    glow: 'on',
    style: {
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    },
  })

  return (
    <$$
      minHeight="100vh"
      padding={36}
      fontFamily="brand"
      color="ink.200"
      display="flex"
      flexDirection="column"
      gap={26}
      at={{ device: { padding: 24 } }}
    >
      <$$.header display="flex" flexDirection="column" gap={12} maxWidth={660}>
        <$$.span className={panelClasses}>Composition helpers</$$.span>
        <$$.h1 margin={0} fontSize={38} lineHeight="1.05" at={{ device: { fontSize: 32 } }}>
          Build repeatable UI with cx, cv, scv, and sv
        </$$.h1>
        <$$.p margin={0} color="ink.400" lineHeight={1.6}>
          This template leans on Boss utilities to compose className tokens and style
          objects while keeping the JSX clean.
        </$$.p>
        <$$.div display="flex" flexWrap="wrap" gap={10}>
          <span className={badge({ tone: 'accent' })}>cx</span>
          <span className={badge({ tone: 'neutral' })}>cv</span>
          <span className={badge({ tone: 'neutral' })}>scv</span>
          <span className={badge({ tone: 'neutral' })}>sv</span>
        </$$.div>
      </$$.header>

      <$$ {...gridProps}>
        {highlights.map(item => (
          <$$.div
            key={item.label}
            padding={16}
            borderRadius="lg"
            backgroundColor="surface.800"
            borderWidth={1}
            borderStyle="solid"
            borderColor="surface.700"
            display="flex"
            flexDirection="column"
            gap={8}
          >
            <$$.span fontSize={12} textTransform="uppercase" letterSpacing="0.18em" color="ink.500">
              {item.label}
            </$$.span>
            <$$.p margin={0} color="ink.300" lineHeight={1.5}>
              {item.body}
            </$$.p>
          </$$.div>
        ))}
      </$$>

      <$$
        display="grid"
        gap={16}
        gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
      >
        {panels.map(panelItem => {
          const classes = featureCard({ tone: panelItem.tone })
          return (
            <div key={panelItem.title} className={classes.root}>
              <span className={classes.meta}>Utility layer</span>
              <strong className={classes.title}>{panelItem.title}</strong>
              <p className={classes.body}>{panelItem.body}</p>
            </div>
          )
        })}
      </$$>
    </$$>
  )
}
