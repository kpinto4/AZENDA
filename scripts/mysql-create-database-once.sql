-- Ejecutar una sola vez con el cliente mysql (no borra datos si la base ya existe):
--   mysql -h 127.0.0.1 -P 3306 -u root -p < scripts/mysql-create-database-once.sql
CREATE DATABASE IF NOT EXISTS azenda CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
