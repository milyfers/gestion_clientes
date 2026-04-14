<?php
header("Content-Type: application/json");
require_once '../cors.php';
require_once '../config.php';
aplicarCORS();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error de conexión"]);
    exit();
}

$data  = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');

if (!$email) {
    http_response_code(400);
    echo json_encode(["message" => "Email requerido"]);
    exit();
}

$metodo = trim($data['metodo'] ?? 'email');

// ── Buscar usuario ──────────────────────────────────────────────────────
$stmt = $conn->prepare("SELECT id, email, nombre FROM usuarios WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "message"    => "Si el email está registrado, recibirás un código.",
        "encontrado" => false
    ]);
    $conn->close();
    exit();
}

$user = $result->fetch_assoc();

// ── Invalidar tokens/códigos anteriores ────────────────────────────────
$stmtInv = $conn->prepare("UPDATE password_resets SET usado = 1 WHERE usuario_id = ? AND usado = 0");
$stmtInv->bind_param("i", $user['id']);
$stmtInv->execute();

// ── Generar código y token ─────────────────────────────────────────────
$codigo = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$token  = bin2hex(random_bytes(32));
$expira = date('Y-m-d H:i:s', strtotime('+2 minutes'));

$stmtToken = $conn->prepare("INSERT INTO password_resets (usuario_id, token, expira) VALUES (?, ?, ?)");
$stmtToken->bind_param("iss", $user['id'], $token, $expira);
$stmtToken->execute();

$stmtCod = $conn->prepare("INSERT INTO mfa_codes (usuario_id, codigo, expira) VALUES (?, ?, ?)");
$stmtCod->bind_param("iss", $user['id'], $codigo, $expira);
$stmtCod->execute();

// ── Máscara de teléfono para SMS/llamada ──────────────────────────────
$telefonoMask = '';
if ($metodo === 'sms' || $metodo === 'llamada') {
    $telefonoMask = '***-***-' . rand(1000, 9999);
}

// ── Respuesta ─────────────────────────────────────────────────────────
$respuesta = [
    "message"       => "Credenciales correctas. Verifica tu código.",
    "encontrado"    => true,
    "usuarioId"     => $user['id'],
    "email"         => $user['email'],
    "telefono_mask" => $telefonoMask,
    "metodo"        => $metodo
];

if ($_SERVER['SERVER_NAME'] === 'localhost') {
    $respuesta['codigo_dev'] = $codigo;
    $respuesta['token_dev']  = $token;
}

echo json_encode($respuesta);
$conn->close();
?>