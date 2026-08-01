// ===== INICIO OWASP A1 =====
// PLANTILLA de acceso a MySQL. NO se conecta todavía a ninguna base de datos:
// documenta el esquema y deja listas TODAS las consultas como
// Prepared Statements (placeholders `?`), nunca concatenadas.
//
// Cuando exista el backend, cada función recibirá una conexión mysql2/promise
// y se registrará el repositorio con `registrarRepositorios({ citas: ... })`.
// ===== FIN OWASP A1 =====
//
// ===== INICIO SOLID - DIP =====
// Estas plantillas implementarán las mismas interfaces de `interfaces.ts`,
// por lo que los componentes seguirán dependiendo de la abstracción.
// ===== FIN SOLID - DIP =====
import { consultaPreparada, type ConsultaPreparada } from "@/seguridad/validacion";

/** DDL previsto (referencia para la migración). */
export const ESQUEMA_MYSQL = `
CREATE TABLE usuarios (
  correo        VARCHAR(120) PRIMARY KEY,
  dni           CHAR(8)      NOT NULL UNIQUE,
  fecha_emision DATE         NOT NULL,
  nombre        VARCHAR(80)  NOT NULL,
  telefono      VARCHAR(9)   NULL,
  contrasena    VARCHAR(72)  NOT NULL, -- hash BCrypt, nunca texto plano
  rol           ENUM('Paciente','Medico','Admin') NOT NULL DEFAULT 'Paciente',
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicos (
  id           VARCHAR(40) PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL,
  correo       VARCHAR(120) NOT NULL UNIQUE,
  especialidad VARCHAR(60) NOT NULL,
  sede         VARCHAR(60) NOT NULL
);

CREATE TABLE disponibilidad (
  doctor_id     VARCHAR(40) PRIMARY KEY,
  dias_semana   VARCHAR(20) NOT NULL,
  hora_inicio   TIME NOT NULL,
  hora_fin      TIME NOT NULL,
  duracion_min  SMALLINT NOT NULL,
  CONSTRAINT fk_disp_medico FOREIGN KEY (doctor_id) REFERENCES medicos(id)
);

CREATE TABLE citas (
  codigo           VARCHAR(20) PRIMARY KEY,
  paciente_correo  VARCHAR(120) NOT NULL,
  doctor_id        VARCHAR(40)  NOT NULL,
  especialidad     VARCHAR(60)  NOT NULL,
  sede             VARCHAR(60)  NOT NULL,
  fecha            DATE NOT NULL,
  hora             TIME NOT NULL,
  estado           ENUM('Programada','Reprogramada','Cancelada','Atendida','No asistió') NOT NULL,
  es_urgente       TINYINT(1) NOT NULL DEFAULT 0,
  observaciones    TEXT NULL,
  fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_slot (doctor_id, fecha, hora),
  CONSTRAINT fk_cita_paciente FOREIGN KEY (paciente_correo) REFERENCES usuarios(correo),
  CONSTRAINT fk_cita_medico   FOREIGN KEY (doctor_id) REFERENCES medicos(id)
);

CREATE TABLE auditoria (
  id       VARCHAR(40) PRIMARY KEY,
  usuario  VARCHAR(120) NOT NULL,
  accion   VARCHAR(40)  NOT NULL,
  detalle  TEXT NULL,
  fecha    DATE NOT NULL,
  hora     TIME NOT NULL
);
`;

/** Consultas listas para usarse con Prepared Statements. */
export const CONSULTAS = {
  citasPorPaciente: (correo: string): ConsultaPreparada =>
    consultaPreparada(
      "SELECT * FROM citas WHERE paciente_correo = ? ORDER BY fecha, hora",
      [correo],
    ),
  citasPorDoctor: (doctorId: string): ConsultaPreparada =>
    consultaPreparada(
      "SELECT * FROM citas WHERE doctor_id = ? ORDER BY fecha, hora",
      [doctorId],
    ),
  buscarPacientePorNombre: (termino: string): ConsultaPreparada =>
    consultaPreparada(
      "SELECT * FROM usuarios WHERE rol = 'Paciente' AND nombre LIKE CONCAT('%', ?, '%')",
      [termino],
    ),
  crearCita: (valores: unknown[]): ConsultaPreparada =>
    consultaPreparada(
      `INSERT INTO citas
        (codigo, paciente_correo, doctor_id, especialidad, sede, fecha, hora, estado, es_urgente)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      valores,
    ),
  cancelarCita: (motivo: string, codigo: string): ConsultaPreparada =>
    consultaPreparada(
      "UPDATE citas SET estado = 'Cancelada', observaciones = CONCAT(COALESCE(observaciones,''), ?) WHERE codigo = ?",
      [motivo, codigo],
    ),
  marcarNoAsistio: (fechaHora: string): ConsultaPreparada =>
    consultaPreparada(
      "UPDATE citas SET estado = 'No asistió' WHERE estado IN ('Programada','Reprogramada') AND CONCAT(fecha,' ',hora) < ?",
      [fechaHora],
    ),
  insertarAuditoria: (valores: unknown[]): ConsultaPreparada =>
    consultaPreparada(
      "INSERT INTO auditoria (id, usuario, accion, detalle, fecha, hora) VALUES (?, ?, ?, ?, ?, ?)",
      valores,
    ),
};
