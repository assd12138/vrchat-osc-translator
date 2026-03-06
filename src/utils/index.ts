export function resampleLinear(input: Float32Array<ArrayBuffer>, srcSr: number, dstSr: number) {
  if (srcSr === dstSr) return input
  const ratio = dstSr / srcSr
  const outLen = Math.max(0, Math.round(input.length * ratio))
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const x = i / ratio
    const x0 = Math.floor(x)
    const x1 = Math.min(x0 + 1, input.length - 1)
    const t = x - x0
    out[i] = input[x0] * (1 - t) + input[x1] * t
  }
  return out
}

export function concatFloat32(a: Float32Array<ArrayBuffer>, b: Float32Array<ArrayBuffer>) {
  const out = new Float32Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}