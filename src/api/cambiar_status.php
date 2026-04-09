<?php
date_default_timezone_set('America/Mexico_City');
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once 'jwt.php';
require_once 'verificar_token.php';

$tokenData = verificarToken();

// Solo Superusuario y Dirección pueden bloquear
if (!in_array($tokenData['role'], ['Superusuario', 'Dirección'])) {
    http_response_code(403);
    echo json_encode(["message" => "Sin permisos para esta acción"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "sistema_auth");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

$data   = json_decode(file_get_contents("php://input"), true);
$id     = (int) ($data['id']   ?? 0);
$status = trim($data['status'] ?? '');

if (!$id || !in_array($status, ['Activo', 'Inactivo'])) {
    http_response_code(400);
    echo json_encode(["message" => "Datos inválidos"]);
    exit();
}

// No puede bloquearse a sí mismo
if ($id === (int)$tokenData['id']) {
    http_response_code(400);
    echo json_encode(["message" => "No puedes bloquearte a ti mismo"]);
    exit();
}

// No puede bloquear usuarios de sistema
$stmtCheck = $conn->prepare("SELECT es_sistema FROM usuarios WHERE id = ?");
$stmtCheck->bind_param("i", $id);
$stmtCheck->execute();
$check = $stmtCheck->get_result()->fetch_assoc();

if (!$check) {
    http_response_code(404);
    echo json_encode(["message" => "Usuario no encontrado"]);
    exit();
}

if ($check['es_sistema']) {
    http_response_code(403);
    echo json_encode(["message" => "No se puede modificar un usuario de sistema"]);
    exit();
}

$stmt = $conn->prepare("UPDATE usuarios SET status = ? WHERE id = ?");
$stmt->bind_param("si", $status, $id);
$stmt->execute();

echo json_encode([
    "message" => $status === 'Inactivo' ? "Usuario bloqueado correctamente" : "Usuario desbloqueado correctamente"
]);

$conn->close();
?>