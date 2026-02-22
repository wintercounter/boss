export default function GradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-[520px] h-[520px] bg-purple-600/30 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute bottom-1/4 left-1/3 w-[420px] h-[420px] bg-cyan-500/25 rounded-full blur-3xl animate-pulse delay-2000" />

      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1233] via-[#0b0b12] to-[#2b1b47]" />

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
