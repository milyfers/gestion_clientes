<?php
date_default_timezone_set('America/Mexico_City');
header("Content-Type: application/json");
require_once '../cors.php';
require_once '../jwt.php';
require_once '../config.php'; 
aplicarCORS();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}
$conn->query("SET time_zone = 'America/Mexico_City'");

$data         = json_decode(file_get_contents("php://input"), true);
$refreshToken = trim($data['refreshToken'] ?? '');

if (!$refreshToken) {
    http_response_code(400);
    echo json_encode(["message" => "Refresh token requerido"]);
    exit();
}

// Buscar token válido en la tabla
$stmt = $conn->prepare("
    SELECT rt.usuario_id, u.email, u.role
    FROM refresh_tokens rt
    INNER JOIN usuarios u ON u.id = rt.usuario_id
    WHERE rt.token = ?
      AND rt.expira > NOW()
    LIMIT 1
");
$stmt->bind_param("s", $refreshToken);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(["message" => "Refresh token inválido o expirado"]);
    exit();
}

$data = $result->fetch_assoc();

// Generar nuevo access token
$accessToken = JWT::generar([
    'id'    => $data['usuario_id'],
    'email' => $data['email'],
    'role'  => $data['role']
], 900);

echo json_encode([
    "accessToken" => $accessToken
]);

$conn->close();
?>