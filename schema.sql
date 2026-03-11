CREATE DATABASE IF NOT EXISTS lollys_db;
USE lollys_db;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `full_name` VARCHAR(255),
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255),
  `google_id` VARCHAR(255) UNIQUE,
  `role` ENUM('user', 'admin', 'suspended') NOT NULL DEFAULT 'user',
  `phone` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `verification_token` VARCHAR(255) DEFAULT NULL,
  `reset_token` VARCHAR(255) DEFAULT NULL,
  `reset_token_expires` DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10, 2) NOT NULL,
  `category` VARCHAR(50),
  `image_url` VARCHAR(255),
  `stock` INT NOT NULL DEFAULT 0,
  `featured` BOOLEAN DEFAULT FALSE,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` VARCHAR(36),
  `customer_email` VARCHAR(255) NOT NULL,
  `customer_name` VARCHAR(255),
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` VARCHAR(50),
  `shipping_address` TEXT,
  `phone` VARCHAR(50),
  `notes` TEXT,
  `status` ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `image_url` VARCHAR(255),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_email` VARCHAR(255) NOT NULL,
  `customer_name` VARCHAR(255),
  `subject` VARCHAR(255),
  `message` TEXT,
  `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium',
  `status` ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  `admin_response` TEXT,
  `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);