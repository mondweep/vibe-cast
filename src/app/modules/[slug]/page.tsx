import { getModuleBySlug, getAllModuleSlugs } from "@/lib/modules";
import { ModuleViewer } from "@/components/course/ModuleViewer";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return getAllModuleSlugs().map(slug => ({ slug }));
}

export default function ModulePage({ params }: { params: { slug: string } }) {
  const moduleData = getModuleBySlug(params.slug);
  if (!moduleData) notFound();
  return <ModuleViewer module={moduleData} />;
}
