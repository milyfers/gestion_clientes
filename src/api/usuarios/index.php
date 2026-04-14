<?php
header("Content-Type: application/json");
require_once '../cors.php';
require_once '../auth_middleware.php'; 
require_once '../config.php';
aplicarCORS();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {         
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}
$usuarioToken = verificarToken();
verificarRol($usuarioToken, ['Superusuario', 'Dirección']); // solo admins
verificarRateLimit($conn, $_SERVER['REMOTE_ADDR'], 'clientes', 60);

$method = $_SERVER['REQUEST_METHOD'];
$data   = json_decode(file_get_contents("php://input"), true);

switch ($method) {

    // ── LISTAR / BUSCAR ──────────────────────────────────────
    case 'GET':
        $q = isset($_GET['q']) ? '%' . $conn->real_escape_string($_GET['q']) . '%' : '%';

        // ── GET por ID ───────────────────────────────────────
        if (isset($_GET['id'])) {
            $id = (int) $_GET['id'];
            $stmt = $conn->prepare("
                SELECT u.id, u.nombre, u.email, u.status,
                       u.fecha_registro  AS fechaRegistro,
                       u.ultimo_acceso   AS ultimoAcceso,
                       r.id              AS role,
                       r.nombre          AS roleNombre,
                       r.es_sistema
                FROM usuarios u
                JOIN roles r ON r.id = u.role
                WHERE u.id = ?
            ");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result  = $stmt->get_result();
            $usuario = $result->fetch_assoc();

            if ($usuario) {
                $usuario['id']         = (int)  $usuario['id'];
                $usuario['role']       = (int)  $usuario['role'];
                $usuario['es_sistema'] = (bool) $usuario['es_sistema'];
                echo json_encode($usuario);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Usuario no encontrado"]);
            }
            break;
        }

        // ── GET listado / búsqueda ───────────────────────────
        $stmt = $conn->prepare("
            SELECT u.id, u.nombre, u.email, u.status,
                   u.fecha_registro  AS fechaRegistro,
                   u.ultimo_acceso   AS ultimoAcceso,
                   r.id              AS role,
                   r.nombre          AS roleNombre,
                   r.es_sistema
            FROM usuarios u
            JOIN roles r ON r.id = u.role
            WHERE u.nombre LIKE ? OR u.email LIKE ? OR r.nombre LIKE ?
            ORDER BY u.nombre ASC
        ");
        $stmt->bind_param("sss", $q, $q, $q);
        $stmt->execute();
        $result = $stmt->get_result();

        $usuarios = [];
        while ($row = $result->fetch_assoc()) {
            $row['id']         = (int)  $row['id'];
            $row['role']       = (int)  $row['role'];
            $row['es_sistema'] = (bool) $row['es_sistema'];
            $usuarios[] = $row;
        }
        echo json_encode($usuarios);
        break;

    // ── CREAR ────────────────────────────────────────────────
    case 'POST':
        if (empty($data['nombre']) || empty($data['email']) ||
            empty($data['password']) || empty($data['role'])) {
            http_response_code(400);
            echo json_encode(["message" => "Todos los campos son obligatorios"]);
            exit();
        }

        // Verificar que el rol exista
        $stmtRol = $conn->prepare("SELECT id FROM roles WHERE id = ?");
        $stmtRol->bind_param("i", $data['role']);
        $stmtRol->execute();
        if ($stmtRol->get_result()->num_rows === 0) {
            http_response_code(400);
            echo json_encode(["message" => "El rol especificado no existe"]);
            exit();
        }

        // Verificar que el email no exista
        $stmtCheck = $conn->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmtCheck->bind_param("s", $data['email']);
        $stmtCheck->execute();
        if ($stmtCheck->get_result()->num_rows > 0) {
            http_response_code(409);
            echo json_encode(["message" => "Este email ya está registrado"]);
            exit();
        }

        $hash  = password_hash($data['password'], PASSWORD_BCRYPT);
        $fecha = date('Y-m-d');
        $role  = (int) $data['role'];

        $stmt = $conn->prepare("
            INSERT INTO usuarios (nombre, email, password, role, status, fecha_registro)
            VALUES (?, ?, ?, ?, 'Activo', ?)
        ");
        $stmt->bind_param("sssis",
            $data['nombre'],
            $data['email'],
            $hash,
            $role,
            $fecha
        );

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode([
                "message" => "Usuario creado correctamente",
                "id"      => $conn->insert_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al crear usuario"]);
        }
        break;

    // ── ACTUALIZAR ───────────────────────────────────────────
    case 'PUT':
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(["message" => "ID requerido"]);
            exit();
        }

        // No permitir modificar al Superusuario (es_sistema = 1)
        $stmtCheck = $conn->prepare("
            SELECT r.es_sistema FROM usuarios u
            JOIN roles r ON r.id = u.role
            WHERE u.id = ?
        ");
        $stmtCheck->bind_param("i", $data['id']);
        $stmtCheck->execute();
        $rowCheck = $stmtCheck->get_result()->fetch_assoc();

        if ($rowCheck && $rowCheck['es_sistema'] == 1) {
            http_response_code(403);
            echo json_encode(["message" => "No se puede modificar al Superusuario"]);
            exit();
        }

        // Verificar que el rol exista
        $stmtRol = $conn->prepare("SELECT id FROM roles WHERE id = ?");
        $stmtRol->bind_param("i", $data['role']);
        $stmtRol->execute();
        if ($stmtRol->get_result()->num_rows === 0) {
            http_response_code(400);
            echo json_encode(["message" => "El rol especificado no existe"]);
            exit();
        }

        $role = (int) $data['role'];

        if (!empty($data['password'])) {
            $hash = password_hash($data['password'], PASSWORD_BCRYPT);
            $stmt = $conn->prepare("
                UPDATE usuarios
                SET nombre=?, email=?, password=?, role=?, status=?
                WHERE id=?
            ");
            $stmt->bind_param("sssisi",
                $data['nombre'], $data['email'], $hash,
                $role, $data['status'], $data['id']
            );
        } else {
            $stmt = $conn->prepare("
                UPDATE usuarios
                SET nombre=?, email=?, role=?, status=?
                WHERE id=?
            ");
            $stmt->bind_param("ssisi",
                $data['nombre'], $data['email'],
                $role, $data['status'], $data['id']
            );
        }

        if ($stmt->execute()) {
            echo json_encode(["message" => "Usuario actualizado correctamente"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar usuario"]);
        }
        break;

    // ── ELIMINAR ─────────────────────────────────────────────
    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);

        if ($id === 0) {
            http_response_code(400);
            echo json_encode(["message" => "ID requerido"]);
            exit();
        }

        // No permitir eliminar Superusuario (es_sistema = 1)
        $stmtCheck = $conn->prepare("
            SELECT r.es_sistema FROM usuarios u
            JOIN roles r ON r.id = u.role
            WHERE u.id = ?
        ");
        $stmtCheck->bind_param("i", $id);
        $stmtCheck->execute();
        $rowCheck = $stmtCheck->get_result()->fetch_assoc();

        if (!$rowCheck) {
            http_response_code(404);
            echo json_encode(["message" => "Usuario no encontrado"]);
            exit();
        }

        if ($rowCheck['es_sistema'] == 1) {
            http_response_code(403);
            echo json_encode(["message" => "No se puede eliminar al Superusuario"]);
            exit();
        }

        $stmt = $conn->prepare("DELETE FROM usuarios WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Usuario eliminado correctamente"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar usuario"]);
        }
        break;
}

$conn->close();
?>