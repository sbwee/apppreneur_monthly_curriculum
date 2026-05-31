import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicShowcase } from "@/src/lib/showcaseApi";
import {
  buildShowcaseFallbackMetadata,
  buildShowcaseNotFoundMetadata,
  buildShowcasePageMetadata,
} from "@/src/lib/showcaseMetadata";
import { mapShowcasePayload } from "@/src/lib/showcaseMapper";
import { ShowcasePage } from "@/src/views/ShowcasePage";

type ShowcaseRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ShowcaseRouteProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const payload = await fetchPublicShowcase(slug);
    if (!payload) {
      return buildShowcaseNotFoundMetadata();
    }

    return buildShowcasePageMetadata(payload);
  } catch {
    return buildShowcaseFallbackMetadata();
  }
}

export default async function ShowcaseRoute({ params }: ShowcaseRouteProps) {
  const { slug } = await params;
  const payload = await fetchPublicShowcase(slug);

  if (!payload) {
    notFound();
  }

  const data = mapShowcasePayload(payload);
  return <ShowcasePage data={data} slug={payload.slug} />;
}
