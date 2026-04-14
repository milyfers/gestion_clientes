#!/bin/bash

# Railway inyecta $PORT dinámicamente, Apache debe escuchar en ese puerto
PORT=${PORT:-80}

# Cambiar el puerto en Apache
sed -i "s/Listen 80/Listen $PORT/" /etc/apache2/ports.conf
sed -i "s/:80>/:$PORT>/" /etc/apache2/sites-available/*.conf

# Iniciar Apache en primer plano
apache2-foreground