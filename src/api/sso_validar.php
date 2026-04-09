<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once 'jwt.php';
require_once 'verificar_token.php';

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