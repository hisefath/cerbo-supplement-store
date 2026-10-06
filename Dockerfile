# Production image: FrankenPHP (Caddy + PHP in one binary) serving Laravel. Runs on any container host.
FROM dunglas/frankenphp:1.12-php8.5-alpine

RUN install-php-extensions pdo_pgsql intl opcache zip
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN composer dump-autoload --optimize --no-dev && php artisan package:discover --ansi

ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr

# Migrate, seed demo data (no-op unless the DB is empty), cache config, then serve on Railway's $PORT.
CMD php artisan migrate --force && php artisan db:seed --force \
    && php artisan config:cache && php artisan route:cache && php artisan view:cache \
    && exec frankenphp php-server --root public --listen ":${PORT:-8080}"
