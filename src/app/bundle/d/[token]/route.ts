import { recordBundleDownload, signedBundleUrl } from "@/lib/bundle";

/**
 * A buyer's permanent download link: checks the purchase, then sends the browser on to a short-lived signed link to
 * the latest zip, so the file itself stays private.
 */
export async function GET(_request: Request, { params }: RouteContext<"/bundle/d/[token]">) {
  const { token } = await params;
  const purchase = await recordBundleDownload(token);
  if (!purchase) return new Response("Unknown download link", { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { Location: await signedBundleUrl(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
