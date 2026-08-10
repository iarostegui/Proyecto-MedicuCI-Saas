import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  HeartPulse,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Clock,
  IdCard,
  CalendarDays,
  Check,
  Stethoscope,
  HeartHandshake,
  Baby,
  Brain,
  Bone,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import clinicImg from "@/assets/clinic.jpg";
import {
  buscarUsuarioPorCorreo,
  buscarMedicoPorCorreo,
  esCorreoInstitucional,
  inicializarAlmacen,
  validarContrasena,
  validarCorreo,
  validarDni,
  validarFechaEmision,
  validarNombre,
} from "@/servicios/servicio_sesion";
// ===== SOLID - DIP =====
// La vista habla con la FACHADA DE DATOS: si la API MySQL está disponible usa
// el backend real; si no (vista previa), cae al almacenamiento local.
import { iniciarSesion, registrarPaciente } from "@/servicios/fachada_datos";


export const Route = createFileRoute("/inicio_sesion")({
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
  component: Pagina_Inicio_Sesion,
});

const ESPECIALIDADES_PREFERENCIA = [
  { id: "familiar", label: "Medicina familiar", icon: HeartHandshake },
  { id: "adultos_mayores", label: "Especialidades para adultos mayores", icon: HeartPulse },
  { id: "pediatria", label: "Pediatría", icon: Baby },
  { id: "salud_mental", label: "Salud mental", icon: Brain },
  { id: "traumatologia", label: "Traumatología", icon: Bone },
  { id: "general", label: "Medicina general", icon: Stethoscope },
] as const;

type Errores_Registro = Partial<
  Record<"dni" | "fechaEmision" | "nombre" | "correo" | "contrasena" | "terminos" | "form", string>
>;
type Errores_Login = Partial<Record<"correo" | "contrasena" | "form", string>>;

function Pagina_Inicio_Sesion() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [preferencias, setPreferencias] = useState<string[]>([]);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  // Registro
  const [dni, setDni] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [nombre, setNombre] = useState("");
  const [correoReg, setCorreoReg] = useState("");
  const [contrasenaReg, setContrasenaReg] = useState("");
  const [erroresRegistro, setErroresRegistro] = useState<Errores_Registro>({});

  // Login
  const [correoLogin, setCorreoLogin] = useState("");
  const [contrasenaLogin, setContrasenaLogin] = useState("");
  const [erroresLogin, setErroresLogin] = useState<Errores_Login>({});

  function alternarPreferencia(id: string) {
    setPreferencias((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function cambiarModo(m: "login" | "registro") {
    setModo(m);
    setErroresRegistro({});
    setErroresLogin({});
  }

  function manejarLogin(e: React.FormEvent) {
    e.preventDefault();
    inicializarAlmacen();
    const errs: Errores_Login = {};
    const errCorreo = validarCorreo(correoLogin);
    if (errCorreo) errs.correo = errCorreo;
    if (!contrasenaLogin) errs.contrasena = "Ingresa tu contraseña.";
    if (Object.keys(errs).length) {
      setErroresLogin(errs);
      return;
    }

    const correo = correoLogin.trim();

    // ===== INICIO OWASP A2 =====
    // La verificación de credenciales (BCrypt + emisión de JWT) vive en el
    // servicio de autenticación; la vista sólo muestra el resultado.
    const acceso = iniciarSesionSegura(correo, contrasenaLogin);
    if (!acceso.ok) {
      setErroresLogin({ form: acceso.error });
      return;
    }
    navigate({ to: acceso.destino ?? "/panel_principal" });
    // ===== FIN OWASP A2 =====
  }


  function manejarRegistro(e: React.FormEvent) {
    e.preventDefault();
    inicializarAlmacen();
    const errs: Errores_Registro = {};
    const eDni = validarDni(dni);
    if (eDni) errs.dni = eDni;
    const eFecha = validarFechaEmision(fechaEmision);
    if (eFecha) errs.fechaEmision = eFecha;
    const eNombre = validarNombre(nombre);
    if (eNombre) errs.nombre = eNombre;
    const eCorreo = validarCorreo(correoReg);
    if (eCorreo) errs.correo = eCorreo;
    const eContrasena = validarContrasena(contrasenaReg);
    if (eContrasena) errs.contrasena = eContrasena;
    if (!aceptaTerminos) errs.terminos = "Debes aceptar los términos y el tratamiento de datos.";

    const correo = correoReg.trim();

    if (!errs.correo && esCorreoInstitucional(correo)) {
      if (buscarMedicoPorCorreo(correo)) {
        errs.correo =
          "Esta cuenta pertenece al personal médico del hospital.";
      } else {
        errs.correo =
          "Las cuentas institucionales sólo pueden ser creadas por un administrador del sistema.";
      }
    }
    if (!errs.correo && buscarUsuarioPorCorreo(correo)) {
      errs.correo = "Ya existe una cuenta con este correo. Inicia sesión.";
    }
    if (Object.keys(errs).length) {
      setErroresRegistro(errs);
      return;
    }

    // ===== INICIO OWASP A2 =====
    // El registro delega en el servicio: hashea con BCrypt y emite el JWT.
    const alta = registrarPacienteSeguro({
      dni,
      fechaEmision,
      nombre: nombre.trim(),
      correo,
      contrasena: contrasenaReg,
      especialidades: preferencias,
    });
    if (!alta.ok) {
      setErroresRegistro({ form: alta.error ?? "No se pudo completar el registro." });
      return;
    }
    navigate({ to: alta.destino ?? "/panel_principal" });
    // ===== FIN OWASP A2 =====
  }


  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      {/* Móvil: banner de imagen — se oculta por completo en registro */}
      <div
        className={`relative overflow-hidden lg:hidden ${modo === "registro" ? "hidden" : "h-44 sm:h-56"}`}
      >
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

      {/* Escritorio: imagen lateral */}
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

      {/* Formulario */}
      <div className="relative flex items-center justify-center overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 size-80 rounded-full bg-primary-soft blur-3xl" />
          <div className="absolute -bottom-24 right-0 size-96 rounded-full bg-accent/50 blur-3xl" />
        </div>

        <div
          className={`relative flex w-full flex-col justify-center px-4 py-2 sm:px-6 lg:px-6 lg:py-12 ${modo === "registro" ? "max-w-2xl" : "max-w-md"}`}
        >
          <div
            className={`animate-rise text-center lg:mb-8 ${modo === "registro" ? "mb-2" : "mb-3"}`}
          >
            <span
              className={`mx-auto mb-2 grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-card)] lg:hidden ${modo === "registro" ? "hidden" : ""}`}
            >
              <HeartPulse className="size-5" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">Medicu CI</h1>
            <p
              className={`mt-1 text-pretty text-sm text-muted-foreground lg:mt-2 ${modo === "registro" ? "hidden lg:block" : ""}`}
            >
              {modo === "login"
                ? "Accede a tus citas y tu historial médico."
                : "Crea tu cuenta en menos de un minuto."}
            </p>
          </div>

          <div className="animate-rise rounded-3xl border border-border/70 bg-card p-3 shadow-[var(--shadow-card)] [animation-delay:80ms] sm:p-5 lg:p-8">
            {/* Pestañas */}
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 lg:mb-6">
              {(["login", "registro"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => cambiarModo(m)}
                  className={
                    "rounded-full py-1.5 text-xs font-semibold transition-colors lg:py-2 lg:text-sm " +
                    (modo === m
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {m === "login" ? "Iniciar sesión" : "Registrarme"}
                </button>
              ))}
            </div>

            {modo === "registro" ? (
              <form onSubmit={manejarRegistro} className="space-y-2 lg:space-y-4" noValidate>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-4">
                  <div className="space-y-2 lg:space-y-4">
                    <Seccion paso={1} titulo="Documento de identidad">
                      <Campo
                        icono={<IdCard className="size-[18px]" />}
                        type="text"
                        inputMode="numeric"
                        placeholder="DNI (8 dígitos)"
                        autoComplete="off"
                        maxLength={8}
                        value={dni}
                        onChange={(e) =>
                          setDni(e.target.value.replace(/\D/g, "").slice(0, 8))
                        }
                        error={erroresRegistro.dni}
                      />
                      <div>
                        <label className="mb-1 block pl-1 text-xs font-medium text-muted-foreground">
                          Fecha de emisión
                        </label>
                        <Campo
                          icono={<CalendarDays className="size-[18px]" />}
                          type="date"
                          autoComplete="off"
                          value={fechaEmision}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setFechaEmision(e.target.value)}
                          error={erroresRegistro.fechaEmision}
                        />
                      </div>
                    </Seccion>

                    <Seccion paso={2} titulo="Datos personales">
                      <Campo
                        icono={<User className="size-[18px]" />}
                        type="text"
                        placeholder="Nombre completo"
                        autoComplete="name"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        error={erroresRegistro.nombre}
                      />
                      <Campo
                        icono={<Mail className="size-[18px]" />}
                        type="email"
                        placeholder="Correo electrónico"
                        autoComplete="email"
                        value={correoReg}
                        onChange={(e) => setCorreoReg(e.target.value)}
                        error={erroresRegistro.correo}
                      />
                      <Campo
                        icono={<Lock className="size-[18px]" />}
                        type="password"
                        placeholder="Contraseña (mín. 8, letras y números)"
                        autoComplete="new-password"
                        value={contrasenaReg}
                        onChange={(e) => setContrasenaReg(e.target.value)}
                        error={erroresRegistro.contrasena}
                      />
                    </Seccion>
                  </div>

                  <Seccion paso={3} titulo="Preferencias de especialidad">
                    <p className="-mt-1 pl-1 text-xs text-muted-foreground">
                      Elige una o varias (opcional).
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {ESPECIALIDADES_PREFERENCIA.map((s) => {
                        const activa = preferencias.includes(s.id);
                        const Icono = s.icon;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => alternarPreferencia(s.id)}
                            aria-pressed={activa}
                            className={
                              "relative flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-medium transition-all lg:text-sm " +
                              (activa
                                ? "border-primary bg-primary-soft text-foreground shadow-sm"
                                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")
                            }
                          >
                            <span
                              className={
                                "grid size-6 shrink-0 place-items-center rounded-lg " +
                                (activa
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-muted-foreground")
                              }
                            >
                              <Icono className="size-3.5" />
                            </span>
                            <span className="leading-tight">{s.label}</span>
                            {activa && (
                              <Check className="absolute right-2 top-2 size-3.5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </Seccion>
                </div>

                <label className="flex items-start gap-2 rounded-xl border border-border/70 bg-secondary/30 p-2 lg:p-3">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
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
                {erroresRegistro.terminos && <Error_Formulario mensaje={erroresRegistro.terminos} />}

                <Button type="submit" size="lg" className="w-full text-base">
                  Crear cuenta
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={manejarLogin} className="space-y-4" noValidate>
                <Campo
                  icono={<Mail className="size-[18px]" />}
                  type="email"
                  placeholder="Correo electrónico"
                  autoComplete="email"
                  value={correoLogin}
                  onChange={(e) => setCorreoLogin(e.target.value)}
                  error={erroresLogin.correo}
                />
                <Campo
                  icono={<Lock className="size-[18px]" />}
                  type="password"
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  value={contrasenaLogin}
                  onChange={(e) => setContrasenaLogin(e.target.value)}
                  error={erroresLogin.contrasena}
                />
                <div className="text-right">
                  <button type="button" className="text-xs font-medium text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                {erroresLogin.form && <Error_Formulario mensaje={erroresLogin.form} />}
                <Button type="submit" size="lg" className="w-full text-base">
                  Entrar
                  <ArrowRight className="size-4" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => cambiarModo("registro")}
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

function Seccion({
  paso,
  titulo,
  children,
}: {
  paso: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/40 p-3 lg:p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold lg:mb-3">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground lg:size-6 lg:text-xs">
          {paso}
        </span>
        {titulo}
      </h3>
      <div className="space-y-2 lg:space-y-3">{children}</div>
    </section>
  );
}

function Campo({
  icono,
  error,
  ...props
}: { icono: React.ReactNode; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icono}
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

function Error_Formulario({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-xs font-medium text-destructive">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{mensaje}</span>
    </div>
  );
}
