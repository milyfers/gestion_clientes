FROM php:8.2-apache

# Copiar todo
COPY . /var/www/html/

# Activar mod_rewrite
RUN a2enmod rewrite

# Cambiar Document Root directamente con la ruta real (sin variable)
RUN sed -ri -e 's!/var/www/html!/var/www/html/src/api!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!/var/www/html/src/api!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Permitir .htaccess en el nuevo document root
RUN sed -ri -e 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

# Permisos
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

EXPOSE 80