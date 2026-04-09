<?php
require_once 'jwt.php';

function verificarToken(): array {
    $headers = getallheaders();
    $auth    = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!$auth || !str_starts_with($auth, 'Bearer ')) {
        http_response_code(401);
        echo json_encode(["message" => "Token requerido"]);
        exit();
    }

    $token     = substr($auth, 7);
    $resultado = JWT::verificar($token);

    if (!$resultado['valido']) {
        http_response_code(401);
        echo json_encode(["message" => $resultado['error']]);
        exit();
    }

    // AGREGA ESTO — verificar status en BD en cada petición
    $conn = new mysqli("localhost", "root", "", "sistema_auth");
    if (!$conn->connect_error) {
        $userId = (int) $resultado['data']['id'];
        $stmt = $conn->prepare("SELECT status FROM usuarios WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $conn->close();

        if ($user && $user['status'] === 'Inactivo') {
            http_response_code(403);
            echo json_encode(["message" => "Cuenta bloqueada"]);
            exit();
        }
    }

    return $resultado['data'];
}
?>