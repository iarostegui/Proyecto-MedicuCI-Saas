-- Semillas Medicu CI — catálogos y cuentas institucionales.
-- Idempotente: se puede ejecutar varias veces sin duplicar datos.
-- Contraseña de todos los médicos: Medicu2026  |  admin@medicu.ci.com: Admin2026
-- Cambie estas contraseñas en producción.

START TRANSACTION;

-- 1) Estados de cita
INSERT INTO estado_cita (nombre_estado) VALUES ('Programada') ON DUPLICATE KEY UPDATE nombre_estado = VALUES(nombre_estado);
INSERT INTO estado_cita (nombre_estado) VALUES ('Reprogramada') ON DUPLICATE KEY UPDATE nombre_estado = VALUES(nombre_estado);
INSERT INTO estado_cita (nombre_estado) VALUES ('Cancelada') ON DUPLICATE KEY UPDATE nombre_estado = VALUES(nombre_estado);
INSERT INTO estado_cita (nombre_estado) VALUES ('Atendida') ON DUPLICATE KEY UPDATE nombre_estado = VALUES(nombre_estado);
INSERT INTO estado_cita (nombre_estado) VALUES ('No asistió') ON DUPLICATE KEY UPDATE nombre_estado = VALUES(nombre_estado);

-- 2) Sedes
INSERT INTO sede (nombre, direccion, estado) VALUES ('Lima', 'Av. Principal s/n — Lima', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO sede (nombre, direccion, estado) VALUES ('San Borja', 'Av. Principal s/n — San Borja', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO sede (nombre, direccion, estado) VALUES ('Mediocentro San Isidro', 'Av. Principal s/n — Mediocentro San Isidro', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO sede (nombre, direccion, estado) VALUES ('Surco El Polo', 'Av. Principal s/n — Surco El Polo', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO sede (nombre, direccion, estado) VALUES ('La Molina', 'Av. Principal s/n — La Molina', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';

-- 3) Especialidades
INSERT INTO especialidad (nombre, estado) VALUES ('Cardiología', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO especialidad (nombre, estado) VALUES ('Dermatología', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO especialidad (nombre, estado) VALUES ('Ginecología', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO especialidad (nombre, estado) VALUES ('Medicina General', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO especialidad (nombre, estado) VALUES ('Neurología', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO especialidad (nombre, estado) VALUES ('Oftalmología', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO especialidad (nombre, estado) VALUES ('Pediatría', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';
INSERT INTO especialidad (nombre, estado) VALUES ('Traumatología', 'Activo') ON DUPLICATE KEY UPDATE estado = 'Activo';

-- 4) Administrador
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('admin@medicu.ci.com', '$2b$10$MsPDu2ofVumH/yt/rzqq3uESzGn7jhmIrJhlLuEXCAx9ehFgyGVce', 'Admin', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Admin';

-- 5) Cuentas institucionales de los médicos (@medicu.ci.com)
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('jimmy@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0001', 'Jimmy', 'Paredes', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'jimmy@medicu.ci.com' AND e.nombre = 'Cardiología' AND s.nombre = 'Lima'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('lucia@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0002', 'Lucía', 'Vargas', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'lucia@medicu.ci.com' AND e.nombre = 'Medicina General' AND s.nombre = 'Lima'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('rosa@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0003', 'Rosa', 'Núñez', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'rosa@medicu.ci.com' AND e.nombre = 'Ginecología' AND s.nombre = 'Lima'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('mirella@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0004', 'Mirella', 'Cornejo', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'mirella@medicu.ci.com' AND e.nombre = 'Pediatría' AND s.nombre = 'San Borja'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('carla@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0005', 'Carla', 'Espinoza', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'carla@medicu.ci.com' AND e.nombre = 'Dermatología' AND s.nombre = 'San Borja'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('pablo@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0006', 'Pablo', 'Reyes', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'pablo@medicu.ci.com' AND e.nombre = 'Medicina General' AND s.nombre = 'San Borja'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('andres@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0007', 'Andrés', 'Molina', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'andres@medicu.ci.com' AND e.nombre = 'Medicina General' AND s.nombre = 'Mediocentro San Isidro'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('soledad@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0008', 'Soledad', 'Ríos', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'soledad@medicu.ci.com' AND e.nombre = 'Neurología' AND s.nombre = 'Mediocentro San Isidro'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('marco@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0009', 'Marco', 'Tello', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'marco@medicu.ci.com' AND e.nombre = 'Cardiología' AND s.nombre = 'Mediocentro San Isidro'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('hector@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0010', 'Héctor', 'Ramírez', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'hector@medicu.ci.com' AND e.nombre = 'Traumatología' AND s.nombre = 'Surco El Polo'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('paola@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0011', 'Paola', 'Suárez', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'paola@medicu.ci.com' AND e.nombre = 'Pediatría' AND s.nombre = 'Surco El Polo'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('ivan@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0012', 'Iván', 'Delgado', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'ivan@medicu.ci.com' AND e.nombre = 'Oftalmología' AND s.nombre = 'Surco El Polo'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('david@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0013', 'David', 'Alcántara', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'david@medicu.ci.com' AND e.nombre = 'Dermatología' AND s.nombre = 'La Molina'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';
INSERT INTO usuario (correo, contrasena, rol, estado) VALUES ('valeria@medicu.ci.com', '$2b$10$tpM2QBCPFZ4inLVoD1u9kudqrRaNb8jrJ8TrAF3q0FaX3CJQWgvTK', 'Medico', 'Activo') ON DUPLICATE KEY UPDATE rol = 'Medico';
INSERT INTO medico (id_usuario, codigo_medico, nombres, apellidos, id_especialidad, id_sede, estado)
SELECT u.id_usuario, 'CM0014', 'Valeria', 'Ochoa', e.id_especialidad, s.id_sede, 'Activo'
  FROM usuario u, especialidad e, sede s
 WHERE u.correo = 'valeria@medicu.ci.com' AND e.nombre = 'Ginecología' AND s.nombre = 'La Molina'
ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad), id_sede = VALUES(id_sede), estado = 'Activo';

-- 6) Disponibilidad de ejemplo: 08:00–13:00 (bloques de 30 min) los próximos 21 días
--    para todos los médicos activos, sin domingos.
INSERT IGNORE INTO disponibilidad (id_medico, fecha, hora_inicio, hora_fin, estado)
SELECT m.id_medico, d.fecha, h.hora, ADDTIME(h.hora, '00:30:00'), 'Libre'
  FROM medico m
  JOIN (SELECT CURDATE() + INTERVAL seq DAY AS fecha
          FROM (SELECT 0 seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
                UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
                UNION SELECT 20) s) d
  JOIN (SELECT '08:00:00' hora UNION SELECT '08:30:00' UNION SELECT '09:00:00'
        UNION SELECT '09:30:00' UNION SELECT '10:00:00' UNION SELECT '10:30:00'
        UNION SELECT '11:00:00' UNION SELECT '11:30:00' UNION SELECT '12:00:00'
        UNION SELECT '12:30:00') h
 WHERE m.estado = 'Activo' AND DAYOFWEEK(d.fecha) <> 1;

COMMIT;
