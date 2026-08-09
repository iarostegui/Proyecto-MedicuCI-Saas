-- =====================================================================
-- MEDICU CI — Esquema físico MySQL (compatible con Aiven MySQL 8.x)
-- Ejecutar sobre la base de datos ya existente en Aiven (p. ej. `defaultdb`).
-- Todo es idempotente: usa CREATE TABLE IF NOT EXISTS y INSERT IGNORE.
-- NO contiene DROP ni TRUNCATE: no destruye datos existentes.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. CATÁLOGOS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS estado_cita (
  id_estado      INT AUTO_INCREMENT PRIMARY KEY,
  nombre_estado  VARCHAR(20)  NOT NULL,
  descripcion    VARCHAR(120) NULL,
  UNIQUE KEY uq_estado_nombre (nombre_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS especialidad (
  id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(80)  NOT NULL,
  descripcion     VARCHAR(255) NULL,
  estado          ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  UNIQUE KEY uq_especialidad_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sede (
  id_sede   INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(80)  NOT NULL,
  direccion VARCHAR(180) NULL,
  estado    ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  UNIQUE KEY uq_sede_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. USUARIOS / ACTORES
--    `usuario` centraliza credenciales y rol (OWASP A2/A5).
--    `paciente` y `medico` extienden al usuario 1:1.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
  correo         VARCHAR(120) NOT NULL,
  contrasena     VARCHAR(72)  NOT NULL,          -- hash BCrypt, nunca texto plano
  rol            ENUM('Paciente','Medico','Admin') NOT NULL DEFAULT 'Paciente',
  estado         ENUM('Activo','Inactivo','Bloqueado') NOT NULL DEFAULT 'Activo',
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso  DATETIME NULL,
  UNIQUE KEY uq_usuario_correo (correo),
  KEY ix_usuario_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paciente (
  id_paciente        INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT         NOT NULL,
  nombres            VARCHAR(80) NOT NULL,
  apellidos          VARCHAR(80) NULL,
  dni                CHAR(8)     NOT NULL,
  fecha_emision_dni  DATE        NULL,
  telefono           VARCHAR(15) NULL,
  direccion          VARCHAR(180) NULL,
  fecha_registro     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado             ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  UNIQUE KEY uq_paciente_dni (dni),
  UNIQUE KEY uq_paciente_usuario (id_usuario),
  CONSTRAINT fk_paciente_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS medico (
  id_medico       INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario      INT         NOT NULL,
  codigo_medico   VARCHAR(30) NOT NULL,          -- id usado hoy en el frontend
  nombres         VARCHAR(80) NOT NULL,
  apellidos       VARCHAR(80) NULL,
  id_especialidad INT         NOT NULL,
  id_sede         INT         NOT NULL,
  colegiatura     VARCHAR(20) NULL,
  estado          ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  UNIQUE KEY uq_medico_usuario (id_usuario),
  UNIQUE KEY uq_medico_codigo (codigo_medico),
  KEY ix_medico_especialidad (id_especialidad),
  KEY ix_medico_sede (id_sede),
  CONSTRAINT fk_medico_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_medico_especialidad FOREIGN KEY (id_especialidad)
    REFERENCES especialidad (id_especialidad) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_medico_sede FOREIGN KEY (id_sede)
    REFERENCES sede (id_sede) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Preferencias de especialidad elegidas por el paciente en el registro.
CREATE TABLE IF NOT EXISTS paciente_preferencia (
  id_paciente     INT NOT NULL,
  id_especialidad INT NOT NULL,
  PRIMARY KEY (id_paciente, id_especialidad),
  CONSTRAINT fk_pref_paciente FOREIGN KEY (id_paciente)
    REFERENCES paciente (id_paciente) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pref_especialidad FOREIGN KEY (id_especialidad)
    REFERENCES especialidad (id_especialidad) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. DISPONIBILIDAD (1 médico -> N franjas)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS disponibilidad (
  id_disponibilidad INT AUTO_INCREMENT PRIMARY KEY,
  id_medico   INT  NOT NULL,
  fecha       DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin    TIME NOT NULL,
  estado      ENUM('Libre','Reservado','Bloqueado') NOT NULL DEFAULT 'Libre',
  UNIQUE KEY uq_disp_medico_fecha_hora (id_medico, fecha, hora_inicio),
  KEY ix_disp_busqueda (id_medico, fecha, estado),
  CONSTRAINT fk_disp_medico FOREIGN KEY (id_medico)
    REFERENCES medico (id_medico) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_disp_horas CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. CITAS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cita (
  id_cita         INT AUTO_INCREMENT PRIMARY KEY,
  codigo_cita     VARCHAR(20) NOT NULL,          -- CI-YYYY-NNNNN
  id_paciente     INT  NOT NULL,
  id_medico       INT  NOT NULL,
  id_especialidad INT  NOT NULL,
  id_sede         INT  NOT NULL,
  id_estado       INT  NOT NULL,
  fecha           DATE NOT NULL,
  hora            TIME NOT NULL,
  motivo          VARCHAR(255) NULL,
  observaciones   VARCHAR(500) NULL,
  urgente         TINYINT(1) NOT NULL DEFAULT 0,
  fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualiza DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cita_codigo (codigo_cita),
  -- Evita doble reserva del mismo médico en la misma fecha/hora.
  UNIQUE KEY uq_cita_medico_slot (id_medico, fecha, hora),
  KEY ix_cita_paciente (id_paciente, fecha),
  KEY ix_cita_medico (id_medico, fecha),
  KEY ix_cita_estado (id_estado),
  CONSTRAINT fk_cita_paciente FOREIGN KEY (id_paciente)
    REFERENCES paciente (id_paciente) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cita_medico FOREIGN KEY (id_medico)
    REFERENCES medico (id_medico) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_cita_especialidad FOREIGN KEY (id_especialidad)
    REFERENCES especialidad (id_especialidad) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_cita_sede FOREIGN KEY (id_sede)
    REFERENCES sede (id_sede) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_cita_estado FOREIGN KEY (id_estado)
    REFERENCES estado_cita (id_estado) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cancelacion (
  id_cancelacion   INT AUTO_INCREMENT PRIMARY KEY,
  id_cita          INT NOT NULL,
  motivo           VARCHAR(255) NULL,            -- obligatorio si cancela el médico (validado en API)
  fecha_cancelacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelado_por    ENUM('Paciente','Medico','Sistema') NOT NULL,
  id_usuario       INT NULL,
  KEY ix_cancelacion_cita (id_cita),
  CONSTRAINT fk_cancelacion_cita FOREIGN KEY (id_cita)
    REFERENCES cita (id_cita) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cancelacion_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trazabilidad de reprogramaciones (historial de cambios de la cita).
CREATE TABLE IF NOT EXISTS cita_historial (
  id_historial   INT AUTO_INCREMENT PRIMARY KEY,
  id_cita        INT NOT NULL,
  estado_anterior VARCHAR(20) NULL,
  estado_nuevo    VARCHAR(20) NOT NULL,
  fecha_anterior  DATE NULL,
  hora_anterior   TIME NULL,
  fecha_nueva     DATE NULL,
  hora_nueva      TIME NULL,
  detalle         VARCHAR(255) NULL,
  id_usuario      INT NULL,
  marca_tiempo    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_hist_cita (id_cita),
  CONSTRAINT fk_hist_cita FOREIGN KEY (id_cita)
    REFERENCES cita (id_cita) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_hist_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notas clínicas del médico por cita (historia clínica básica ya existente).
CREATE TABLE IF NOT EXISTS nota_clinica (
  id_nota      INT AUTO_INCREMENT PRIMARY KEY,
  id_cita      INT NOT NULL,
  id_medico    INT NOT NULL,
  contenido    VARCHAR(2000) NOT NULL,
  marca_tiempo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_nota_cita (id_cita),
  CONSTRAINT fk_nota_cita FOREIGN KEY (id_cita)
    REFERENCES cita (id_cita) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_nota_medico FOREIGN KEY (id_medico)
    REFERENCES medico (id_medico) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. NOTIFICACIONES Y AUDITORÍA
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notificacion (
  id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT NOT NULL,
  id_cita      INT NULL,
  tipo         ENUM('Recordatorio','Cancelacion','Reprogramacion','Sistema') NOT NULL DEFAULT 'Sistema',
  titulo       VARCHAR(120) NOT NULL,
  mensaje      VARCHAR(500) NOT NULL,
  leida        TINYINT(1) NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_lectura  DATETIME NULL,
  KEY ix_notif_usuario (id_usuario, leida),
  CONSTRAINT fk_notif_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notif_cita FOREIGN KEY (id_cita)
    REFERENCES cita (id_cita) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
  usuario      VARCHAR(120) NOT NULL,
  accion       VARCHAR(40)  NOT NULL,
  detalle      VARCHAR(500) NULL,
  ip           VARCHAR(45)  NULL,
  marca_tiempo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_auditoria_fecha (marca_tiempo),
  KEY ix_auditoria_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. DATOS SEMILLA (catálogos). No destructivo.
-- ---------------------------------------------------------------------

INSERT IGNORE INTO estado_cita (nombre_estado, descripcion) VALUES
  ('Programada',   'Cita agendada y vigente'),
  ('Reprogramada', 'Cita movida a otra fecha u hora'),
  ('Cancelada',    'Cita cancelada por paciente o médico'),
  ('Atendida',     'Cita realizada'),
  ('No asistió',   'El paciente no se presentó');

INSERT IGNORE INTO sede (nombre) VALUES
  ('Sede Central'), ('Sede Norte'), ('Sede Sur'), ('Sede Este'), ('Sede Oeste');

INSERT IGNORE INTO especialidad (nombre) VALUES
  ('Medicina familiar'), ('Medicina general'), ('Pediatría'),
  ('Salud mental'), ('Traumatología'), ('Adultos mayores'),
  ('Cardiología'), ('Dermatología'), ('Ginecología'), ('Nutrición');
