param(
  [switch]$Up,
  [switch]$Down
)
# Funnel expõe só o Next.js (porta 3000). O Django nunca é exposto diretamente.
if ($Up)    { tailscale funnel --bg 3000 }
if ($Down)  { tailscale funnel reset; tailscale serve reset }
tailscale funnel status
