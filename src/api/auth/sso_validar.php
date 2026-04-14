<?php
header("Content-Type: application/json");
require_once '../cors.php';
require_once '../jwt.php';
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

// Verificar token — si es válido devuelve los datos del usuario
$tokenData = verificarToken();

echo json_encode([
    "valido"  => true,
    "usuario" => [
        "id"    => $tokenData['id'],
        "email" => $tokenData['email'],
        "role"  => $tokenData['role']
    ],
    "mensaje" => "SSO validado correctamente"
]);
?>