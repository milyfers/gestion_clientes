<?php
date_default_timezone_set('America/Mexico_City');
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$conn = new mysqli("localhost", "root", "", "sistema_auth");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

$data      = json_decode(file_get_contents("php://input"), true);
$usuarioId = (int) ($data['usuarioId'] ?? 0);

if (!$usuarioId) {
    http_response_code(400);
    echo json_encode(["message" => "Usuario requerido"]);
    exit();
}

// Verificar que el usuario existe
$stmt = $conn->prepare("SELECT id, email, nombre FROM usuarios WHERE id = ?");
$stmt->bind_param("i", $usuarioId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["message" => "Usuario no encontrado"]);
    exit();
}

$user = $result->fetch_assoc();

// Invalidar códigos anteriores
$stmtInv = $conn->prepare("UPDATE mfa_codes SET usado = 1 WHERE usuario_id = ? AND usado = 0");
$stmtInv->bind_param("i", $usuarioId);
$stmtInv->execute();

// Generar código de 6 dígitos
$codigo = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expira = date('Y-m-d H:i:s', strtotime('+5 minutes'));

// Guardar en BD
$stmtCod = $conn->prepare("INSERT INTO mfa_codes (usuario_id, codigo, expira) VALUES (?, ?, ?)");
$stmtCod->bind_param("iss", $usuarioId, $codigo, $expira);
$stmtCod->execute();

// Simular envío de email — en producción aquí va mail()
echo json_encode([
    "message"    => "Código enviado al correo " . $user['email'],
    "usuarioId"  => $usuarioId,
    "email"      => $user['email'],
    // ── Solo en desarrollo — quitar en producción ──
    "codigo_dev" => $codigo
]);

$conn->close();
?>