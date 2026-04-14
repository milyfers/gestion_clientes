<?php
header("Content-Type: application/json");
require_once '../cors.php';
require_once '../jwt.php';
require_once '../auth_middleware.php';
require_once '../config.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

verificarToken();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ── OBTENER NOTIFICACIONES NO LEÍDAS ──────────────────────
    case 'GET':
        $desdeId = (int) ($_GET['desde'] ?? 0);

        $stmt = $conn->prepare("
            SELECT id, mensaje, tipo, created_at AS timestamp
            FROM notificaciones
            WHERE leida = 0 AND id > ?
            ORDER BY created_at DESC
            LIMIT 5
        ");
        $stmt->bind_param("i", $desdeId);
        $stmt->execute();
        $result = $stmt->get_result();

        $notificaciones = [];
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int) $row['id'];
            $notificaciones[] = $row;
        }
        echo json_encode($notificaciones);
        break;

    // ── MARCAR COMO LEÍDA ─────────────────────────────────────
    case 'PUT':
        $id = (int) ($_GET['id'] ?? 0);

        if ($id) {
            $stmt = $conn->prepare("UPDATE notificaciones SET leida = 1 WHERE id = ?");
            $stmt->bind_param("i", $id);
        } else {
            // Marcar todas como leídas
            $stmt = $conn->prepare("UPDATE notificaciones SET leida = 1 WHERE leida = 0");
        }

        $stmt->execute();
        echo json_encode(["message" => "Actualizado"]);
        break;
}

$conn->close();
?>