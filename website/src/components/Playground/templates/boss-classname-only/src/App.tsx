export default function App() {
  return (
    <div className="min-height:100vh padding:32 display:flex flex-direction:column gap:24 background:hero font-family:brand color:ink.100">
      <header className="display:flex flex-direction:column gap:12 max-width:640">
        <span className="display:inline-flex align-items:center gap:10 font-size:12 text-transform:uppercase letter-spacing:0.2em color:ink.500">
          Classname-only strategy
        </span>
        <h1 className="margin:0 font-size:36 line-height:1.1">
          No runtime, just static className strings
        </h1>
        <p className="margin:0 color:ink.400 line-height:1.6">
          This template uses only className parsing. Boss extracts prop:value tokens from
          static strings and emits CSS without runtime.
        </p>
      </header>

      <div className="display:grid gap:16 grid-template-columns:repeat(auto-fit,_minmax(220px,_1fr))">
        <div className="padding:20 border-radius:xl background-color:surface.800 border:1px_solid border-color:surface.700">
          <strong className="font-size:16">Static tokens</strong>
          <p className="margin:8_0_0 color:ink.400 line-height:1.5">
            Tokens like surface.800 and ink.400 are resolved without any runtime.
          </p>
        </div>
        <div className="padding:20 border-radius:xl background-color:surface.800 border:1px_solid border-color:surface.700 hover:border-color:accent.400">
          <strong className="font-size:16">Pseudo states</strong>
          <p className="margin:8_0_0 color:ink.400 line-height:1.5">
            Hover styles are parsed directly from className strings.
          </p>
        </div>
        <div className="padding:20 border-radius:xl background-color:surface.800 border:1px_solid border-color:surface.700">
          <strong className="font-size:16">Responsive rules</strong>
          <p className="margin:8_0_0 color:ink.400 line-height:1.5">
            Use mobile: or at: tokens to target breakpoints.
          </p>
          <div className="margin-top:12 padding:10 border-radius:lg background-color:surface.900 mobile:background-color:accent.500 mobile:color:surface.900">
            Mobile breakpoint preview
          </div>
        </div>
      </div>
    </div>
  )
}
