import { PackExporter } from "@/components/exporter/PackExporter";

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PackExporter packId={id} />;
}
