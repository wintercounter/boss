export default function App() {
  return (
    <div className="min-h:100vh p:8 flex flex-col gap:8 bg:slate.950 font-family:brand text:slate.100">
      <header className="flex flex-col gap:3 max-width:640">
        <span className="text:slate.400 text-transform:uppercase letter-spacing:0.2em font-size:12">
          Bosswind classNames
        </span>
        <h1 className="margin:0 font-size:36 line-height:1.1">
          Tailwind-style tokens in className strings
        </h1>
        <p className="margin:0 text:slate.300 line-height:1.6">
          Bosswind aliases and tokens work in props and className, so you can ship static
          CSS with Tailwind-style semantics.
        </p>
      </header>

      <div className="grid gap:6 grid-template-columns:repeat(auto-fit,_minmax(220px,_1fr))">
        <div className="p:6 rounded:2xl shadow:xl bg:slate.900 border:1 border-style:solid border-color:slate.800 flex flex-col gap:3">
          <strong className="font-size:16">Boolean utilities</strong>
          <p className="margin:0 text:slate.300 line-height:1.5">
            Tokens like <code>flex</code>, <code>grid</code>, and <code>flex-col</code> map
            directly to display and layout helpers.
          </p>
        </div>

        <div className="p:6 rounded:2xl shadow:xl bg:slate.900 border:1 border-style:solid border-color:slate.800 flex flex-col gap:3">
          <strong className="font-size:16">Aliases</strong>
          <p className="margin:0 text:slate.300 line-height:1.5">
            Use <code>p</code>, <code>gap</code>, and <code>rounded</code> for concise spacing
            and shape control.
          </p>
          <div className="flex gap:2 flex-wrap">
            {['p:6', 'rounded:2xl', 'gap:3'].map(item => (
              <span
                key={item}
                className="px:3 py:1 rounded:full text:slate.200 bg:slate.800 font-size:12"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="p:6 rounded:2xl shadow:xl bg:slate.900 border:1 border-style:solid border-color:slate.800 flex flex-col gap:3">
          <strong className="font-size:16">Theme tokens</strong>
          <p className="margin:0 text:slate.300 line-height:1.5">
            Bosswind ships Tailwind colors, so <code>bg:slate.900</code> or{' '}
            <code>text:sky.400</code> just work.
          </p>
          <span className="px:4 py:2 rounded:full bg:sky.400 text:slate.950 font-weight:600 align-self:flex-start">
            Accent chip
          </span>
        </div>
      </div>
    </div>
  )
}
