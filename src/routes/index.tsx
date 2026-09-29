import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medicu CI" },
      { name: "description", content: "Accede a tu cuenta Medicu CI." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/inicio_sesion" });
  },
});
