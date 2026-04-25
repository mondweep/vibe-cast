import { researchPodsData } from "@/lib/static-data";
import PodDetailClient from "./PodDetailClient";

export function generateStaticParams() {
  return researchPodsData.pods.map((pod) => ({ id: pod.id }));
}

export default async function PodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PodDetailClient podId={id} />;
}
