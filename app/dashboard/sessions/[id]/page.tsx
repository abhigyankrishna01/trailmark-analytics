import EventTimeline from "@/components/EventTimeline";

export const dynamic = "force-dynamic";

export default function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <EventTimeline sessionId={params.id} />;
}
