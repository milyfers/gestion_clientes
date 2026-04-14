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

$data      = json_decode(file_get_contents("php://input"), true);
$accion    = trim($data['accion'] ?? '');
$usuarioId = (int) ($data['usuarioId'] ?? 0);

// ── ACCIÓN: obtener pregunta del usuario ──────────────────────
if ($accion === 'obtener') {
    $email = trim($data['email'] ?? '');
    if (!$email) {
        http_response_code(400);
        echo json_encode(["message" => "Email requerido"]);
        exit();
    }

    $stmt = $conn->prepare("
        SELECT id, pregunta_secreta 
        FROM usuarios 
        WHERE email = ? AND pregunta_secreta IS NOT NULL
    ");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) {
        echo json_encode(["encontrado" => false]);
        exit();
    }

    echo json_encode([
        "encontrado" => true,
        "usuarioId"  => $user['id'],
        "pregunta"   => $user['pregunta_secreta']
    ]);
    exit();
}

// ── ACCIÓN: verificar respuesta ───────────────────────────────
if ($accion === 'verificar') {
    $respuesta = trim($data['respuesta'] ?? '');
    error_log("usuarioId: " . $usuarioId . " | respuesta: " . $respuesta);
    if (!$usuarioId || !$respuesta) {
        http_response_code(400);
        echo json_encode(["message" => "Datos incompletos"]);
        exit();
    }

    $stmt = $conn->prepare("
        SELECT respuesta_secreta FROM usuarios WHERE id = ?
    ");
    $stmt->bind_param("i", $usuarioId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user || !password_verify(strtolower($respuesta), $user['respuesta_secreta'])) {
        http_response_code(400);
        echo json_encode(["message" => "Respuesta incorrecta"]);
        exit();
    }

    // Generar código para que pueda cambiar contraseña
    $codigo = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expira = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    $stmtCod = $conn->prepare("
        INSERT INTO mfa_codes (usuario_id, codigo, expira) VALUES (?, ?, ?)
    ");
    $stmtCod->bind_param("iss", $usuarioId, $codigo, $expira);
    $stmtCod->execute();

    $respuesta_json = ["message" => "Respuesta correcta", "usuarioId" => $usuarioId];
    if ($_SERVER['SERVER_NAME'] === 'localhost') {
        $respuesta_json['codigo_dev'] = $codigo;
    }

    echo json_encode($respuesta_json);
    exit();
}

// ── ACCIÓN: guardar pregunta (desde perfil/settings) ─────────
if ($accion === 'guardar') {
    $pregunta  = trim($data['pregunta']  ?? '');
    $respuesta = trim($data['respuesta'] ?? '');

    if (!$usuarioId || !$pregunta || !$respuesta) {
        http_response_code(400);
        echo json_encode(["message" => "Datos incompletos"]);
        exit();
    }

    $hash = password_hash(strtolower($respuesta), PASSWORD_BCRYPT);

    $stmt = $conn->prepare("
        UPDATE usuarios 
        SET pregunta_secreta = ?, respuesta_secreta = ? 
        WHERE id = ?
    ");
    $stmt->bind_param("ssi", $pregunta, $hash, $usuarioId);
    $stmt->execute();

    echo json_encode(["message" => "Pregunta secreta guardada correctamente"]);
    exit();
}

http_response_code(400);
echo json_encode(["message" => "Acción no válida"]);
$conn->close();
?>