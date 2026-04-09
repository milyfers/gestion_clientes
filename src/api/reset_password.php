<?php
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
$codigo    = trim($data['codigo']    ?? '');
$password  = trim($data['password']  ?? '');

if (!$usuarioId || !$codigo || !$password) {
    http_response_code(400);
    echo json_encode(["message" => "Datos incompletos"]);
    exit();
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(["message" => "La contraseña debe tener mínimo 8 caracteres"]);
    exit();
}

// Verificar código
$stmt = $conn->prepare("
    SELECT id FROM mfa_codes
    WHERE usuario_id = ?
      AND codigo = ?
      AND usado = 0
      AND expira > NOW()
    ORDER BY created_at DESC
    LIMIT 1
");
$stmt->bind_param("is", $usuarioId, $codigo);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(["message" => "Código inválido o expirado"]);
    exit();
}

$mfaId = $result->fetch_assoc()['id'];

// Marcar código como usado
$stmtUp = $conn->prepare("UPDATE mfa_codes SET usado = 1 WHERE id = ?");
$stmtUp->bind_param("i", $mfaId);
$stmtUp->execute();

// Actualizar contraseña
$hash = password_hash($password, PASSWORD_BCRYPT);
$stmtPass = $conn->prepare("UPDATE usuarios SET password = ? WHERE id = ?");
$stmtPass->bind_param("si", $hash, $usuarioId);
$stmtPass->execute();

// Invalidar todos los tokens de reset
$stmtReset = $conn->prepare("UPDATE password_resets SET usado = 1 WHERE usuario_id = ?");
$stmtReset->bind_param("i", $usuarioId);
$stmtReset->execute();

echo json_encode(["message" => "Contraseña actualizada correctamente"]);

$conn->close();
?>