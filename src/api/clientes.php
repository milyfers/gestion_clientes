<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once 'helpers.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$conn = new mysqli("localhost", "root", "", "sistema_auth");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

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
            SELECT id, nombre,
                   razon_social    AS razonSocial,
                   rfc, contacto, telefono, email,
                   ciudad, estado, status,
                   forma_pago      AS formaPago,
                   uso_cfdi        AS usoCFDI,
                   fecha_registro  AS fechaRegistro,
                   (SELECT COUNT(*) FROM proyectos WHERE cliente_id = clientes.id) AS proyectos
            FROM clientes
            WHERE id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $cliente = $result->fetch_assoc();

        if ($cliente) {
            $cliente['id']       = (int) $cliente['id'];
            $cliente['proyectos'] = (int) $cliente['proyectos'];
            echo json_encode($cliente);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Cliente no encontrado"]);
        }
        break;
    }

    // ── Listar / Buscar todos ─────────────────────────────────
    $stmt = $conn->prepare("
        SELECT id, nombre,
               razon_social    AS razonSocial,
               rfc, contacto, telefono, email,
               ciudad, estado, status,
               forma_pago      AS formaPago,
               uso_cfdi        AS usoCFDI,
               fecha_registro  AS fechaRegistro,
               (SELECT COUNT(*) FROM proyectos WHERE cliente_id = clientes.id) AS proyectos
        FROM clientes
        WHERE nombre LIKE ? OR rfc LIKE ? OR contacto LIKE ? OR email LIKE ?
        ORDER BY nombre ASC
    ");
    $stmt->bind_param("ssss", $q, $q, $q, $q);
    $stmt->execute();
    $result = $stmt->get_result();

    $clientes = [];
    while ($row = $result->fetch_assoc()) {
        $row['id']       = (int) $row['id'];
        $row['proyectos'] = (int) $row['proyectos'];
        $clientes[] = $row;
    }
    echo json_encode($clientes);
    break;

    // ── CREAR ────────────────────────────────────────────────
    case 'POST':
    $stmt = $conn->prepare("
        INSERT INTO clientes (nombre, razon_social, rfc, contacto, telefono, email, ciudad, estado, status, forma_pago, uso_cfdi, fecha_registro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("ssssssssssss",
        $data['nombre'], $data['razonSocial'], $data['rfc'],
        $data['contacto'], $data['telefono'], $data['email'],
        $data['ciudad'], $data['estado'], $data['status'],
        $data['formaPago'], $data['usoCFDI'], $data['fechaRegistro']
    );

    if ($stmt->execute()) {
        $data['id'] = $conn->insert_id;
        $data['proyectos'] = 0;
        crearNotificacion($conn, "Nuevo cliente registrado: {$data['nombre']}", 'success');
        http_response_code(201);
        echo json_encode($data);
    } else {
        http_response_code(500);
        echo json_encode(["message" => "Error al crear cliente"]);
    }
    break;

    // ── ACTUALIZAR ───────────────────────────────────────────
    case 'PUT':
        $stmt = $conn->prepare("
            UPDATE clientes SET nombre=?, razon_social=?, rfc=?, contacto=?, telefono=?,
            email=?, ciudad=?, estado=?, status=?, forma_pago=?, uso_cfdi=?
            WHERE id=?
        ");
        $stmt->bind_param("sssssssssssi",
            $data['nombre'], $data['razonSocial'], $data['rfc'],
            $data['contacto'], $data['telefono'], $data['email'],
            $data['ciudad'], $data['estado'], $data['status'],
            $data['formaPago'], $data['usoCFDI'], $data['id']
        );

        if ($stmt->execute()) {
            echo json_encode($data);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar"]);
        }
        break;

    // ── ELIMINAR ─────────────────────────────────────────────
    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);
        $stmt = $conn->prepare("DELETE FROM clientes WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            echo json_encode(["message" => "Cliente eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar"]);
        }
        break;
}

$conn->close();
?>