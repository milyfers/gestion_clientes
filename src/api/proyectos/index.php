<?php
header("Content-Type: application/json");
require_once '../cors.php';
require_once '../helpers.php';
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
verificarRateLimit($conn, $_SERVER['REMOTE_ADDR'], 'clientes', 60);

$method = $_SERVER['REQUEST_METHOD'];
$data   = json_decode(file_get_contents("php://input"), true);

switch ($method) {

    // ── LISTAR / BUSCAR ──────────────────────────────────────
    case 'GET':
    $q = isset($_GET['q']) ? '%' . $conn->real_escape_string($_GET['q']) . '%' : '%';

    // ── Buscar por ID específico ──────────────────────────────
    if (isset($_GET['id'])) {
        $id = (int) $_GET['id'];
        $stmt = $conn->prepare("
            SELECT p.id, p.nombre, p.descripcion, p.status,
                   p.presupuesto,
                   p.fecha_inicio  AS fechaInicio,
                   p.fecha_fin     AS fechaFin,
                   p.cliente_id    AS clienteId,
                   c.nombre        AS cliente
            FROM proyectos p
            JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $proyecto = $result->fetch_assoc();

        if ($proyecto) {
            $proyecto['id']         = (int) $proyecto['id'];
            $proyecto['clienteId']  = (int) $proyecto['clienteId'];
            $proyecto['presupuesto'] = (float) $proyecto['presupuesto'];
            echo json_encode($proyecto);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Proyecto no encontrado"]);
        }
        break;
    }

    // ── Listar / Buscar todos ─────────────────────────────────
    $stmt = $conn->prepare("
        SELECT p.id, p.nombre, p.descripcion, p.status,
               p.presupuesto,
               p.fecha_inicio  AS fechaInicio,
               p.fecha_fin     AS fechaFin,
               p.cliente_id    AS clienteId,
               c.nombre        AS cliente
        FROM proyectos p
        JOIN clientes c ON p.cliente_id = c.id
        WHERE p.nombre LIKE ? OR c.nombre LIKE ?
        ORDER BY p.nombre ASC
    ");
    $stmt->bind_param("ss", $q, $q);
    $stmt->execute();
    $result = $stmt->get_result();

    $proyectos = [];
    while ($row = $result->fetch_assoc()) {
        $row['id']          = (int) $row['id'];
        $row['clienteId']   = (int) $row['clienteId'];
        $row['presupuesto'] = (float) $row['presupuesto'];
        $proyectos[] = $row;
    }
    echo json_encode($proyectos);
    break;  

    // ── CREAR ────────────────────────────────────────────────
    case 'POST':
    $stmt = $conn->prepare("
        INSERT INTO proyectos (nombre, descripcion, cliente_id, status, presupuesto, fecha_inicio, fecha_fin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $fechaFin = $data['fechaFin'] ?: null;
    $stmt->bind_param("ssissss",
        $data['nombre'], $data['descripcion'], $data['clienteId'],
        $data['status'], $data['presupuesto'],
        $data['fechaInicio'], $fechaFin
    );

    if ($stmt->execute()) {
        $data['id'] = $conn->insert_id;
        crearNotificacion($conn, "Nuevo proyecto creado: {$data['nombre']}", 'success');
        http_response_code(201);
        echo json_encode($data);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al crear proyecto"]);
    }
    break;

case 'PUT':
    $stmt = $conn->prepare("
        UPDATE proyectos SET nombre=?, descripcion=?, cliente_id=?,
        status=?, presupuesto=?, fecha_inicio=?, fecha_fin=?
        WHERE id=?
    ");
    $fechaFin = $data['fechaFin'] ?: null;
    $stmt->bind_param("ssissssi",
        $data['nombre'], $data['descripcion'], $data['clienteId'],
        $data['status'], $data['presupuesto'],
        $data['fechaInicio'], $fechaFin, $data['id']
    );

    if ($stmt->execute()) {
        if ($data['status'] === 'Finalizado') {
            crearNotificacion($conn, "Proyecto finalizado: {$data['nombre']}", 'success');
        } elseif ($data['status'] === 'Cancelado') {
            crearNotificacion($conn, "Proyecto cancelado: {$data['nombre']}", 'warning');
        }
        echo json_encode($data);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al actualizar"]);
    }
    break;

    // ── ELIMINAR ─────────────────────────────────────────────
    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = $conn->prepare("DELETE FROM proyectos WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Proyecto eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar"]);
        }
        break;
}

$conn->close();
?>