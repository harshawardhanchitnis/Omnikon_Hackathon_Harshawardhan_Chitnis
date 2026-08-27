// Product and Demo Mode intentionally use separate persistence boundaries.
// Demo Topic plans stay in browser-local demo storage and are never
// auto-imported into an authenticated teacher account. Product-generated
// Topic plans are saved explicitly at generation time.
export default function ProductSessionSync() {
  return null
}
