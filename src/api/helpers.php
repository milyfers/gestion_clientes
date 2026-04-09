<?php
function crearNotificacion($conn, string $mensaje, string $tipo = 'info'): void {
    $stmt = $conn->prepare("INSERT INTO notificaciones (mensaje, tipo) VALUES (?, ?)");
    $stmt->bind_param("ss", $mensaje, $tipo);
    $stmt->execute();
}
?>