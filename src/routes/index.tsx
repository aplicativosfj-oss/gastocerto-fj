import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controlaê" },
      { name: "description", content: "Controlaê — página inicial." },
      { property: "og:title", content: "Controlaê" },
      { property: "og:description", content: "Controlaê — página inicial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Controlaê</h1>
    </main>
  );
}
