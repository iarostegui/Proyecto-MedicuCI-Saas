import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HeartPulse, Mail, Lock, User, ArrowRight, ShieldCheck, CalendarCheck, Clock, IdCard, CalendarDays, Check, Stethoscope, HeartHandshake, Baby, Brain, Bone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import clinicImg from "@/assets/clinic.jpg";
import {
  findUserByEmail,
  saveUser,
  setSession,
  validateDni,
  validateEmail,
  validateFullName,
  validateIssueDate,
  validatePassword,
} from "@/lib/auth";

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

type RegisterErrors = Partial<Record<
  "dni" | "issueDate" | "fullName" | "email" | "password" | "terms" | "form",
  string
>>;
type LoginErrors = Partial<Record<"email" | "password" | "form", string>>;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Register fields
  const [dni, setDni] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regErrors, setRegErrors] = useState<RegisterErrors>({});

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});

  function toggleSpecialty(id: string) {
    setSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function switchMode(m: "login" | "register") {
    setMode(m);
    setRegErrors({});
    setLoginErrors({});
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const errs: LoginErrors = {};
    const emailErr = validateEmail(loginEmail);
    if (emailErr) errs.email = emailErr;
    if (!loginPassword) errs.password = "Ingresa tu contraseña.";
    if (Object.keys(errs).length) {
      setLoginErrors(errs);
      return;
    }
    const user = findUserByEmail(loginEmail);
    if (!user || user.password !== loginPassword) {
      setLoginErrors({ form: "Correo o contraseña incorrectos. Si no tienes cuenta, regístrate." });
      return;
    }
    setSession(user.email);
    navigate({ to: "/panel" });
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const errs: RegisterErrors = {};
    const dniErr = validateDni(dni);
    if (dniErr) errs.dni = dniErr;
    const issueErr = validateIssueDate(issueDate);
    if (issueErr) errs.issueDate = issueErr;
    const nameErr = validateFullName(fullName);
    if (nameErr) errs.fullName = nameErr;
    const emailErr = validateEmail(regEmail);
    if (emailErr) errs.email = emailErr;
    const passErr = validatePassword(regPassword);
    if (passErr) errs.password = passErr;
    if (!acceptedTerms) errs.terms = "Debes aceptar los términos y el tratamiento de datos.";
    if (!errs.email && findUserByEmail(regEmail)) {
      errs.email = "Ya existe una cuenta con este correo. Inicia sesión.";
    }
    if (Object.keys(errs).length) {
      setRegErrors(errs);
      return;
    }
    saveUser({
      dni,
      issueDate,
      fullName: fullName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      specialties,
    });
    setSession(regEmail.trim());
    navigate({ to: "/panel" });
  }

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      {/* Mobile: clinic image banner — hide completely on register */}
      <div className={`relative overflow-hidden lg:hidden ${mode === "register" ? "hidden" : "h-44 sm:h-56"}`}>
        <img
          src={clinicImg}
          alt="Recepción de la clínica Medicu CI"
          width={1024}
          height={1536}
          className="absolute inset-0 size-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3 text-primary-foreground">
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

        <div className={`relative flex w-full flex-col justify-center px-4 py-2 sm:px-6 lg:px-6 lg:py-12 ${mode === "register" ? "max-w-2xl" : "max-w-md"}`}>
          <div className={`animate-rise text-center lg:mb-8 ${mode === "register" ? "mb-2" : "mb-3"}`}>
            <span className={`mx-auto mb-2 grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-card)] lg:hidden ${mode === "register" ? "hidden" : ""}`}>
              <HeartPulse className="size-5" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">Medicu CI</h1>
          <p className={`mt-1 text-pretty text-sm text-muted-foreground lg:mt-2 ${mode === "register" ? "hidden lg:block" : ""}`}>
            {mode === "login"
              ? "Accede a tus citas y tu historial médico."
              : "Crea tu cuenta en menos de un minuto."}
          </p>
        </div>

        <div className="animate-rise rounded-3xl border border-border/70 bg-card p-3 shadow-[var(--shadow-card)] [animation-delay:80ms] sm:p-5 lg:p-8">
          {/* tabs */}
          <div className="mb-2 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 lg:mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={
                  "rounded-full py-1.5 text-xs font-semibold transition-colors lg:py-2 lg:text-sm " +
                  (mode === m
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "login" ? "Iniciar sesión" : "Registrarme"}
              </button>
            ))}
          </div>

          {mode === "register" ? (
            <form onSubmit={handleRegister} className="space-y-2 lg:space-y-4" noValidate>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-4">
                {/* Columna izquierda */}
                <div className="space-y-2 lg:space-y-4">
                  <Section step={1} title="Documento de identidad">
                    <Field
                      icon={<IdCard className="size-[18px]" />}
                      type="text"
                      inputMode="numeric"
                      placeholder="DNI (8 dígitos)"
                      autoComplete="off"
                      maxLength={8}
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      error={regErrors.dni}
                    />
                    <div>
                      <label className="mb-1 block pl-1 text-xs font-medium text-muted-foreground">
                        Fecha de emisión
                      </label>
                      <Field
                        icon={<CalendarDays className="size-[18px]" />}
                        type="date"
                        autoComplete="off"
                        value={issueDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setIssueDate(e.target.value)}
                        error={regErrors.issueDate}
                      />
                    </div>
                  </Section>

                  <Section step={2} title="Datos personales">
                    <Field
                      icon={<User className="size-[18px]" />}
                      type="text"
                      placeholder="Nombre completo"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={regErrors.fullName}
                    />
                    <Field
                      icon={<Mail className="size-[18px]" />}
                      type="email"
                      placeholder="Correo electrónico"
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      error={regErrors.email}
                    />
                    <Field
                      icon={<Lock className="size-[18px]" />}
                      type="password"
                      placeholder="Contraseña (mín. 8, letras y números)"
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      error={regErrors.password}
                    />
                  </Section>
                </div>

                {/* Columna derecha: Preferencias */}
                <Section step={3} title="Preferencias de especialidad">
                  <p className="-mt-1 pl-1 text-xs text-muted-foreground">
                    Elige una o varias (opcional).
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {SPECIALTIES.map((s) => {
                      const active = specialties.includes(s.id);
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSpecialty(s.id)}
                          aria-pressed={active}
                          className={
                            "relative flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-medium transition-all lg:text-sm " +
                            (active
                              ? "border-primary bg-primary-soft text-foreground shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                          }
                        >
                          <span
                            className={
                              "grid size-6 shrink-0 place-items-center rounded-lg " +
                              (active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")
                            }
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <span className="leading-tight">{s.label}</span>
                          {active && (
                            <Check className="absolute right-2 top-2 size-3.5 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Section>
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-border/70 bg-secondary/30 p-2 lg:p-3">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <span className="text-xs leading-tight text-muted-foreground">
                  Acepto los{" "}
                  <button type="button" className="font-medium text-primary hover:underline">
                    términos y condiciones
                  </button>{" "}
                  y el{" "}
                  <button type="button" className="font-medium text-primary hover:underline">
                    tratamiento de datos personales
                  </button>{" "}
                  <span className="text-destructive">*</span>
                </span>
              </label>
              {regErrors.terms && <FormError message={regErrors.terms} />}

              <Button type="submit" size="lg" className="w-full text-base">
                Crear cuenta
                <ArrowRight className="size-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <Field
                icon={<Mail className="size-[18px]" />}
                type="email"
                placeholder="Correo electrónico"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                error={loginErrors.email}
              />
              <Field
                icon={<Lock className="size-[18px]" />}
                type="password"
                placeholder="Contraseña"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                error={loginErrors.password}
              />
              <div className="text-right">
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              {loginErrors.form && <FormError message={loginErrors.form} />}
              <Button type="submit" size="lg" className="w-full text-base">
                Entrar
                <ArrowRight className="size-4" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-semibold text-primary hover:underline"
                >
                  Regístrate
                </button>
              </p>
            </form>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground lg:mt-5">
            <ShieldCheck className="size-3.5 text-success" />
            Conexión segura y datos protegidos
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/40 p-3 lg:p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold lg:mb-3">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground lg:size-6 lg:text-xs">
          {step}
        </span>
        {title}
      </h3>
      <div className="space-y-2 lg:space-y-3">{children}</div>
    </section>
  );
}

function Field({
  icon,
  error,
  ...props
}: { icon: React.ReactNode; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          {...props}
          aria-invalid={error ? true : undefined}
          className={
            "h-10 w-full rounded-xl border bg-background pl-11 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:ring-2 lg:h-12 " +
            (error
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : "border-input focus:border-ring focus:ring-ring/20")
          }
        />
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 pl-1 text-[11px] font-medium text-destructive">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-xs font-medium text-destructive">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
