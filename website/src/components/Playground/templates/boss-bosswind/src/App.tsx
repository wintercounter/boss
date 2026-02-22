$$.css({
  body: {
    margin: 0,
    background: 'slate.950',
  },
})

export default function App() {
  return (
    <$$ minH="100vh" p="8" flex flexCol gap="8" fontFamily="brand" text="slate.100" bg="slate.950">
      <$$ flex flexCol gap="3" maxW="2xl">
        <$$ text="slate.400" textTransform="uppercase" letterSpacing="0.2em" fontSize={12}>
          Bosswind utilities
        </$$>
        <$$ as="h1" margin={0} text="slate.100" fontSize={36} lineHeight="1.1">
          Tailwind-style props with Boss syntax
        </$$>
        <$$ text="slate.300" lineHeight={1.6}>
          Bosswind adds boolean utilities, aliases, and Tailwind defaults while keeping
          Boss prop:value semantics.
        </$$>
      </$$>

      <$$
        grid
        gap="5"
        gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
      >
        <$$
          p="6"
          rounded="2xl"
          shadow="xl"
          bg="slate.900"
          border={[1, 'solid']}
          borderColor="slate.800"
          flex
          flexCol
          gap="3"
        >
          <$$ text="slate.100" fontWeight={600}>
            Boolean utilities
          </$$>
          <$$ text="slate.300" lineHeight={1.5}>
            `flex`, `grid`, and `flexCol` behave like Tailwind keywords.
          </$$>
        </$$>

        <$$
          p="6"
          rounded="2xl"
          shadow="xl"
          bg="slate.900"
          border={[1, 'solid']}
          borderColor="slate.800"
          flex
          flexCol
          gap="3"
        >
          <$$ text="slate.100" fontWeight={600}>
            Aliases
          </$$>
          <$$ text="slate.300" lineHeight={1.5}>
            Use `p`, `px`, `gapX`, and `rounded` for concise layouts.
          </$$>
          <$$ flex gapX="3" gapY="2" flexWrap>
            {['p="6"', 'rounded="2xl"', 'gapX="3"'].map(item => (
              <$$
                key={item}
                px="3"
                py="1"
                rounded="full"
                text="slate.200"
                bg="slate.800"
                fontSize={12}
              >
                {item}
              </$$>
            ))}
          </$$>
        </$$>

        <$$
          p="6"
          rounded="2xl"
          shadow="xl"
          bg="slate.900"
          border={[1, 'solid']}
          borderColor="slate.800"
          flex
          flexCol
          gap="3"
        >
          <$$ text="slate.100" fontWeight={600}>
            Theme tokens
          </$$>
          <$$ text="slate.300" lineHeight={1.5}>
            Bosswind ships Tailwind colors, so `bg="slate.900"` just works.
          </$$>
          <$$
            px="4"
            py="2"
            rounded="full"
            bg="sky.400"
            text="slate.950"
            fontWeight={600}
            alignSelf="flex-start"
          >
            Accent chip
          </$$>
        </$$>
      </$$>
    </$$>
  )
}
