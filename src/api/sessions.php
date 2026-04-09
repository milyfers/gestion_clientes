<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once 'jwt.php';
require_once 'verificar_token.php';

$conn = new mysqli("localhost", "root", "", "sistema_auth");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

// Verificar token
$tokenData = verificarToken();
$usuarioId = $tokenData['id'];

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ── LISTAR SESIONES ACTIVAS ───────────────────────────────
    case 'GET':
        $stmt = $conn->prepare("
            SELECT id, ip, user_agent, created_at AS fechaInicio,
                   ultimo_uso AS ultimoUso, expira,
                   activa
            FROM sessions
            WHERE usuario_id = ? AND activa = 1 AND expira > NOW()
            ORDER BY ultimo_uso DESC
        ");
        $stmt->bind_param("i", $usuarioId);
        $stmt->execute();
        $result = $stmt->get_result();

        $sesiones = [];
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int) $row['id'];
            // Identificar sesión actual
            $tokenActual = substr(getallheaders()['Authorization'] ?? '', 7);
            $row['esActual'] = ($row['token'] ?? '') === $tokenActual;
            $sesiones[] = $row;
        }
        echo json_encode($sesiones);
        break;

    // ── CERRAR SESIÓN ESPECÍFICA ──────────────────────────────
    case 'DELETE':
        $sesionId = (int) ($_GET['id'] ?? 0);

        if (!$sesionId) {
            // Cerrar todas las sesiones excepto la actual
            $tokenActual = bin2hex(random_bytes(1)); // placeholder
            $stmt = $conn->prepare("
                UPDATE sessions SET activa = 0
                WHERE usuario_id = ? AND activa = 1
            ");
            $stmt->bind_param("i", $usuarioId);
        } else {
            // Cerrar sesión específica
            $stmt = $conn->prepare("
                UPDATE sessions SET activa = 0
                WHERE id = ? AND usuario_id = ?
            ");
            $stmt->bind_param("ii", $sesionId, $usuarioId);
        }

        $stmt->execute();
        echo json_encode(["message" => "Sesión cerrada correctamente"]);
        break;
}

$conn->close();
?>