import TopBar from "@/components/TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopBar />
      <main className="wrap page">{children}</main>
    </>
  );
}
