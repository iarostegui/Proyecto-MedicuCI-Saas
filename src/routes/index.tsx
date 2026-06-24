import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HeartPulse, Mail, Lock, User, ArrowRight, ShieldCheck, CalendarCheck, Clock, IdCard, CalendarDays, Check, Stethoscope, HeartHandshake, Baby, Brain, Bone, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import clinicImg from "@/assets/clinic.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medicu CI — Acceso" },
      {
        name: "description",
        content: "Inicia sesión o regístrate para agendar y consultar tus citas médicas.",
      },
      { property: "og:title", content: "Medicu CI — Acceso" },
      {
        property: "og:description",
        content: "Inicia sesión o regístrate para agendar y consultar tus citas médicas.",
      },
    ],
  }),
  component: AuthPage,
});

const SPECIALTIES = [
  { id: "familiar", label: "Medicina familiar", icon: HeartHandshake },
  { id: "adultos-mayores", label: "Especialidades para adultos mayores", icon: HeartPulse },
  { id: "pediatria", label: "Pediatría", icon: Baby },
  { id: "salud-mental", label: "Salud mental", icon: Brain },
  { id: "traumatologia", label: "Traumatología", icon: Bone },
  { id: "general", label: "Medicina general", icon: Stethoscope },
] as const;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [specialties, setSpecialties] = useState<string[]>([]);

  function toggleSpecialty(id: string) {
    setSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/panel" });
  }



  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Mobile: clinic image banner */}
      <div className="relative h-44 overflow-hidden sm:h-56 lg:hidden">
        <img
          src={clinicImg}
          alt="Recepción de la clínica Medicu CI"
          width={1024}
          height={1536}
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-5 text-primary-foreground">
          <HeartPulse className="size-5" />
          <span className="text-lg font-extrabold">Medicu CI</span>
        </div>
      </div>

      {/* Left: clinic image (desktop) */}
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src={clinicImg}
          alt="Recepción de la clínica Medicu CI"
          width={1024}
          height={1536}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-primary-foreground">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur-sm">
            <HeartPulse className="size-4" />
            Medicu CI
          </div>
          <h2 className="max-w-sm text-balance text-3xl font-extrabold leading-tight">
            Tu salud, organizada en un solo lugar
          </h2>
          <div className="mt-6 flex flex-wrap gap-5 text-sm font-medium">
            <span className="inline-flex items-center gap-2">
              <CalendarCheck className="size-4" />
              Agenda en segundos
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4" />
              Atención urgente 24/7
            </span>
          </div>
        </div>
      </aside>

      {/* Right: auth form */}
      <div className="relative flex items-center justify-center overflow-hidden bg-background">
        {/* ambient backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 size-80 rounded-full bg-primary-soft blur-3xl" />
          <div className="absolute -bottom-24 right-0 size-96 rounded-full bg-accent/50 blur-3xl" />
        </div>

        <div className="relative flex w-full max-w-md flex-col justify-center px-6 py-12">
          <div className="animate-rise mb-8 text-center">
            <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-card)] lg:hidden">
              <HeartPulse className="size-7" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">Medicu CI</h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            {mode === "login"
              ? "Accede a tus citas y tu historial médico."
              : "Crea tu cuenta en menos de un minuto."}
          </p>
        </div>

        <div className="animate-rise rounded-3xl border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] [animation-delay:80ms] sm:p-8">
          {/* tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={
                  "rounded-full py-2 text-sm font-semibold transition-colors " +
                  (mode === m
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "login" ? "Iniciar sesión" : "Registrarme"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <Field
                icon={<User className="size-[18px]" />}
                type="text"
                placeholder="Nombre completo"
                autoComplete="name"
              />
            )}
            <Field
              icon={<Mail className="size-[18px]" />}
              type="email"
              placeholder="Correo electrónico"
              autoComplete="email"
            />
            <Field
              icon={<Lock className="size-[18px]" />}
              type="password"
              placeholder="Contraseña"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {mode === "login" && (
              <div className="text-right">
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full text-base">
              {mode === "login" ? "Entrar" : "Crear cuenta"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            Conexión segura y datos protegidos
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  ...props
}: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        {...props}
        required
        className="h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </div>
  );
}
