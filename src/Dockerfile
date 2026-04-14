FROM php:8.2-apache

# Copiar todo
COPY . /var/www/html/

# Activar mod_rewrite
RUN a2enmod rewrite

# 👇 CAMBIAR DOCUMENT ROOT
ENV APACHE_DOCUMENT_ROOT /var/www/html/src/api

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Permisos
RUN chown -R www-data:www-data /var/www/html