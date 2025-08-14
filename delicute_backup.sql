-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: delicutee123-oakdental.c.aivencloud.com    Database: defaultdb
-- ------------------------------------------------------
-- Server version	8.0.35

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '4af70670-691b-11f0-8dc9-42010aa6004d:1-478,
4e4a1f7f-6e10-11f0-8aef-42010aa60031:1-928,
698abaa5-576e-11f0-add3-862ccfb03ac9:1-1179,
8f2766e9-6870-11f0-93e2-862ccfb02f84:1-135';

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'vasu','svasu18604@gmail.com','$2b$10$DLVtAGrEZSq9e8nfzALcQu8b7q4MBKtLO.5GI5vQfsJhJS7pQ5OEq');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'VEG PIZZAS','2025-08-02 08:31:38'),(2,'NON-VEG  PIZZAS','2025-08-02 08:31:52'),(3,'WAFFLES','2025-08-02 08:32:11'),(4,'JUICES','2025-08-02 08:32:25'),(5,'SHAKES','2025-08-02 08:32:29'),(7,'COFFEE','2025-08-06 13:26:45'),(8,'CHAI','2025-08-06 13:26:48'),(9,'PASTAS','2025-08-06 13:43:50'),(10,'MAGGIE','2025-08-06 13:43:57'),(11,'MOJITO','2025-08-06 13:49:17'),(12,'POTATO TWISTER','2025-08-06 13:49:32'),(13,'FRENCH FRIES','2025-08-06 13:50:34'),(14,'BURGERS','2025-08-06 13:54:13'),(15,'SANDWICHS','2025-08-06 13:54:34'),(17,'PANCAKES','2025-08-08 17:21:15');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `image` varchar(255) DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `buy_x` int DEFAULT '0',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `category_id` int DEFAULT NULL,
  `valid_from` datetime DEFAULT NULL,
  `valid_to` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `quantity` int DEFAULT NULL,
  `type` varchar(20) NOT NULL,
  `min_cart_amount` decimal(10,2) DEFAULT NULL,
  `bogo_min_qty` int DEFAULT NULL,
  `free_item` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `coupons_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
INSERT INTO `coupons` VALUES (29,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753955412/coupons/DEAL.webp','SHAKES30','BUY ANY 3 SHAKES GET FLAT 20% OFF ',3,20.00,5,NULL,NULL,'2025-08-12 05:40:27',3,'buy_x',NULL,NULL,NULL),(31,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753933404/coupons/OFFER.webp','DELICUTE10','BUY ANY 2 VEG PIZZAS GET 1 PIZZA FREE ',NULL,0.00,1,NULL,NULL,'2025-08-12 05:42:06',2,'bogo',NULL,NULL,NULL);
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu` (
  `_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text,
  `image` varchar(255) NOT NULL,
  `originalPrice` decimal(10,2) NOT NULL,
  `savedPrice` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`_id`),
  KEY `category` (`category`),
  CONSTRAINT `menu_ibfk_1` FOREIGN KEY (`category`) REFERENCES `categories` (`name`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `image_url` varchar(255) DEFAULT NULL,
  `category_id` int NOT NULL,
  `image` text,
  `original_price` decimal(10,2) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `saved_price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_top_pick` tinyint(1) NOT NULL DEFAULT '0',
  `size` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `menu_items_ibfk_1` (`category_id`),
  CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,'CLASSIC','Thin crust with tomato and cheesy sauce, baked crisp.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754477772/menu_items/classic%20veg%20pizza.jpg',99.00,99.00,0.00,'2025-08-08 11:53:07',0,'REGULAR'),(2,'CLASSIC','Thin crust with tomato and cheesy sauce, baked crisp.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754477772/menu_items/classic%20veg%20pizza.jpg',135.00,135.00,0.00,'2025-08-08 11:53:07',0,'MEDIUM'),(3,'CLASSIC','Thin crust with tomato and cheesy sauce, baked crisp.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754477772/menu_items/classic%20veg%20pizza.jpg',189.00,189.00,0.00,'2025-08-08 11:53:07',0,'LARGE'),(4,'ONION/TOMATA','Thin crust with tomato, onion, and cheese, baked crisp.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479629/menu_items/oniontomatovegpizza.webp',109.00,109.00,0.00,'2025-08-08 11:53:07',0,'REGULAR'),(5,'ONION/TOMATA','Thin crust with tomato, onion, and cheese, baked crisp.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479629/menu_items/oniontomatovegpizza.webp',155.00,155.00,0.00,'2025-08-08 11:53:07',0,'MEDIUM'),(6,'ONION/TOMATA','Thin crust with tomato, onion, and cheese, baked crisp.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479629/menu_items/oniontomatovegpizza.webp',239.00,239.00,0.00,'2025-08-08 11:53:07',0,'LARGE'),(7,'GOLDEN CORN','Thin crust topped with golden corn and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754478861/menu_items/golgencornpizza.webp',119.00,119.00,0.00,'2025-08-08 11:53:07',0,'REGULAR'),(8,'GOLDEN CORN','Thin crust topped with golden corn and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754478861/menu_items/golgencornpizza.webp',165.00,165.00,0.00,'2025-08-08 11:53:07',0,'MEDIUM'),(9,'GOLDEN CORN','Thin crust topped with golden corn and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754478861/menu_items/golgencornpizza.webp',249.00,249.00,0.00,'2025-08-08 11:53:07',0,'LARGE'),(10,'PANEER/MUSHROOM','Thin crust topped with paneer/mushrooms and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753943076/menu_items/mushroom%20pizza.jpg',149.00,149.00,0.00,'2025-08-08 11:53:07',0,'REGULAR'),(11,'PANEER/MUSHROOM','Thin crust topped with paneer/mushrooms and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753943076/menu_items/mushroom%20pizza.jpg',185.00,185.00,0.00,'2025-08-08 11:53:07',0,'MEDIUM'),(12,'PANEER/MUSHROOM','Thin crust topped with paneer/mushrooms and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753943076/menu_items/mushroom%20pizza.jpg',259.00,259.00,0.00,'2025-08-08 11:53:07',0,'LARGE'),(13,'PANEER TIKKA','Thin crust topped with paneer tikka pieces and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479231/menu_items/paneervegpizza.jpg',169.00,169.00,0.00,'2025-08-08 11:53:07',0,'REGULAR'),(14,'PANEER TIKKA','Thin crust topped with paneer tikka pieces and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479231/menu_items/paneervegpizza.jpg',215.00,215.00,0.00,'2025-08-08 11:53:07',0,'MEDIUM'),(15,'PANEER TIKKA','Thin crust topped with paneer tikka pieces and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479231/menu_items/paneervegpizza.jpg',279.00,279.00,0.00,'2025-08-08 11:53:07',0,'LARGE'),(16,'VEG LOADED','Thin crust loaded with mixed veggies and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479128/menu_items/vegloadedpizza.webp',179.00,179.00,0.00,'2025-08-08 11:53:07',0,'REGULAR'),(17,'VEG LOADED','Thin crust loaded with mixed veggies and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479128/menu_items/vegloadedpizza.webp',225.00,225.00,0.00,'2025-08-08 11:53:07',0,'MEDIUM'),(18,'VEG LOADED','Thin crust loaded with mixed veggies and cheese, baked to perfection.',NULL,1,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479128/menu_items/vegloadedpizza.webp',289.00,289.00,0.00,'2025-08-08 11:53:07',0,'LARGE'),(19,'CHICKEN','Thin crust with tender chicken and melted cheese, oven-baked.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480410/menu_items/chickennonevegpizza.jpg',149.00,149.00,0.00,'2025-08-08 11:53:08',1,'REGULAR'),(20,'CHICKEN','Thin crust with tender chicken and melted cheese, oven-baked.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480410/menu_items/chickennonevegpizza.jpg',195.00,195.00,0.00,'2025-08-08 11:53:08',1,'MEDIUM'),(21,'CHICKEN','Thin crust with tender chicken and melted cheese, oven-baked.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480410/menu_items/chickennonevegpizza.jpg',269.00,269.00,0.00,'2025-08-08 11:53:08',1,'LARGE'),(22,'CHICKEN SAUSAGE','Baked thin crust with chicken sausage and gooey cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479927/menu_items/chickensausagenonevegpizza.webp',159.00,159.00,0.00,'2025-08-08 11:53:08',0,'REGULAR'),(23,'CHICKEN SAUSAGE','Baked thin crust with chicken sausage and gooey cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479927/menu_items/chickensausagenonevegpizza.webp',215.00,215.00,0.00,'2025-08-08 11:53:08',0,'MEDIUM'),(24,'CHICKEN SAUSAGE','Baked thin crust with chicken sausage and gooey cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479927/menu_items/chickensausagenonevegpizza.webp',279.00,279.00,0.00,'2025-08-08 11:53:08',0,'LARGE'),(25,'PEPPER CHICKEN','Thin crust loaded with pepper chicken and gooey cheese, baked golden.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754672720/menu_items/pepperbarbiquechickenpizza.jpg',159.00,159.00,0.00,'2025-08-08 11:53:08',0,'REGULAR'),(26,'PEPPER CHICKEN','Thin crust loaded with pepper chicken and gooey cheese, baked golden.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754672720/menu_items/pepperbarbiquechickenpizza.jpg',215.00,215.00,0.00,'2025-08-08 11:53:08',0,'MEDIUM'),(27,'PEPPER CHICKEN','Thin crust loaded with pepper chicken and gooey cheese, baked golden.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754672720/menu_items/pepperbarbiquechickenpizza.jpg',279.00,279.00,0.00,'2025-08-08 11:53:08',0,'LARGE'),(28,'CRISPY CHICKEN','Crispy chicken chunks with cheese on a thin crust, oven-baked.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480509/menu_items/crispychickennonvegpizza.webp',169.00,169.00,0.00,'2025-08-08 11:53:08',0,'REGULAR'),(29,'CRISPY CHICKEN','Crispy chicken chunks with cheese on a thin crust, oven-baked.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480509/menu_items/crispychickennonvegpizza.webp',235.00,235.00,0.00,'2025-08-08 11:53:08',0,'MEDIUM'),(30,'CRISPY CHICKEN','Crispy chicken chunks with cheese on a thin crust, oven-baked.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480509/menu_items/crispychickennonvegpizza.webp',319.00,319.00,0.00,'2025-08-08 11:53:08',0,'LARGE'),(31,'PEPPER BBQ/BBQ','Crispy base loaded with BBQ chicken/pepper BBQ and melted cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479850/menu_items/pepperchickennonveg.webp',169.00,169.00,0.00,'2025-08-08 11:53:08',0,'REGULAR'),(32,'PEPPER BBQ/BBQ','Crispy base loaded with BBQ chicken/pepper BBQ and melted cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479850/menu_items/pepperchickennonveg.webp',235.00,235.00,0.00,'2025-08-08 11:53:08',0,'MEDIUM'),(33,'PEPPER BBQ/BBQ','Crispy base loaded with BBQ chicken/pepper BBQ and melted cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754479850/menu_items/pepperchickennonveg.webp',319.00,319.00,0.00,'2025-08-08 11:53:08',0,'LARGE'),(34,'LOADED CHICKEN','Thin crust packed with juicy chicken pieces and melted cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480830/menu_items/loadedchickennonveg.webp',199.00,199.00,0.00,'2025-08-08 11:53:08',0,'REGULAR'),(35,'LOADED CHICKEN','Thin crust packed with juicy chicken pieces and melted cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480830/menu_items/loadedchickennonveg.webp',299.00,299.00,0.00,'2025-08-08 11:53:08',0,'MEDIUM'),(36,'LOADED CHICKEN','Thin crust packed with juicy chicken pieces and melted cheese.',NULL,2,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754480830/menu_items/loadedchickennonveg.webp',339.00,339.00,0.00,'2025-08-08 11:53:08',0,'LARGE'),(37,'HONEY WAFFLE','Sweet, fluffy waffle drizzled with rich natural honey for a warm, delightful treat.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945499/menu_items/WAFLE.jpg',79.00,69.00,10.00,'2025-08-08 17:07:36',0,NULL),(38,'DARK CHOCOLATE','A soft waffle loaded with bold dark chocolate, perfect for a deep, satisfying chocolate craving.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945728/menu_items/dark%20chocolate%20waffle.webp',119.00,109.00,10.00,'2025-08-08 17:07:36',0,NULL),(39,'MILK CHOCOLATE','Soft, warm waffle topped with creamy milk chocolate for a smooth and sweet indulgence.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945588/menu_items/milk%20chcocolate%20waffle.jpg',119.00,109.00,10.00,'2025-08-08 17:07:36',0,NULL),(40,'WHITE CHOCOLATE','Fluffy waffle topped with rich, velvety white chocolate for a sweet and creamy treat.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945698/menu_items/WHITE%20CHOCOLATE%20WAFFLE.jpg',119.00,109.00,10.00,'2025-08-08 17:07:36',0,NULL),(41,'OREO CRUNCH','A soft waffle topped with Oreo crumbs and chocolate sauce, giving a perfect cookies & cream flavour burst.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754130988/menu_items/Oreo%20Waffles%20_%20Greedy%20Gourmet.jpg',129.00,119.00,10.00,'2025-08-08 17:07:36',0,NULL),(42,'NUTELLA MUNCHY','Fluffy waffle generously spread with creamy Nutella for a rich, chocolaty hazelnut treat.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945710/menu_items/nutella%20waffle.jpg',129.00,119.00,10.00,'2025-08-08 17:07:36',0,NULL),(43,'CHOCO OVERLOAD','A warm waffle drenched in layers of dark, milk, and white chocolate for the ultimate chocolate lover?s dream.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753946059/menu_items/chocolate%20waffle%20isolated%20on%20transparent%20background%20%2Cwaffles%20with%20melted%20chocolate%20topping%2C%20generative%20ai.jpg',129.00,119.00,10.00,'2025-08-08 17:07:36',1,NULL),(44,'RED VELVET','Fluffy red velvet waffle drizzled with rich chocolate sauce for a perfect blend of cocoa and sweetness.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675518/menu_items/REDVALLETWAFFLE.jpg',139.00,129.00,10.00,'2025-08-08 17:07:36',0,NULL),(45,'DOUBLE CHOCOLATE','Soft waffle loaded with chocolate chips and drizzled with rich chocolate sauce for a double chocolate delight.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945841/menu_items/Double%20Chocolate%20Waffle.jpg',139.00,129.00,10.00,'2025-08-08 17:07:36',0,NULL),(46,'TRIPLE CHOCOLATE','Soft waffle loaded with chocolate chips and drizzled with rich chocolate sauce for a double chocolate delight.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945876/menu_items/Triple%20Chocolate%20Waffle.jpg',149.00,139.00,10.00,'2025-08-08 17:07:36',0,NULL),(47,'BLUEBERRY WAFFLE','Light, fluffy waffle topped with sweet and tangy blueberries for a refreshing fruity treat.',NULL,3,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945777/menu_items/Blueberry%20Waffle.webp',159.00,149.00,10.00,'2025-08-08 17:07:36',0,NULL),(48,'BANANA SHAKE','Thick and smooth shake blended with fresh bananas for a naturally sweet boost.',NULL,5,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753943829/menu_items/banana%20new.jpg',69.00,59.00,10.00,'2025-08-08 17:09:31',0,NULL),(49,'MUSKMELON SHAKE','Sweet and refreshing muskmelon juice served chilled for a light, cooling drink.',NULL,5,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675046/menu_items/muskmelonshake.jpg',75.00,69.00,6.00,'2025-08-08 17:09:31',0,NULL),(50,'OREO SHAKE','Thick, creamy shake loaded with crushed Oreos for a delicious cookies and cream treat.',NULL,5,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754131700/menu_items/oreo%20new.jpg',95.00,79.00,16.00,'2025-08-08 17:09:31',0,NULL),(51,'KITKAT SHAKE','Creamy shake with crunchy KitKat for a sweet, chocolatey treat.',NULL,5,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674962/menu_items/kit%20kat%20new.jpg',99.00,89.00,10.00,'2025-08-08 17:09:31',0,NULL),(52,'STRAWBERRY SHAKE','Rich and creamy strawberry shake for a refreshing fruity treat.',NULL,5,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753943851/menu_items/strawberry%20new.jpg',99.00,89.00,10.00,'2025-08-08 17:09:31',0,NULL),(53,'VANILLA SHAKE','Creamy and refreshing shake with the timeless flavour of vanilla.',NULL,5,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754481581/menu_items/vanillashake.jpg',95.00,89.00,6.00,'2025-08-08 17:09:31',0,NULL),(54,'AVOCADO SHAKE','Thick and silky avocado shake for a healthy and delicious drink.',NULL,5,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754481508/menu_items/5a925b2d-315b-4dfc-9be7-e883740e97ab.jpg',115.00,99.00,16.00,'2025-08-08 17:09:31',0,NULL),(55,'CHOCOLATE SHAKE','Thick, smooth shake with a deep, chocolaty flavour for pure indulgence.',NULL,5,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753943800/menu_items/chocolate%20shake.webp',109.00,99.00,10.00,'2025-08-08 17:09:31',0,NULL),(56,'LIME MOJITOOO','Refreshing lime and mint drink with a fizzy twist.',NULL,11,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1755056237/menu_items/06fdc1a6-8708-46cf-84d5-e426aaa61f09.jpg',59.00,49.00,10.00,'2025-08-08 17:09:37',0,NULL),(57,'ORANGE MOJITO','Fresh orange mojito made with juicy orange pulp, mint leaves, and soda for a pulpy, citrusy refreshment.',NULL,11,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674780/menu_items/ornagemojito.jpg',69.00,59.00,10.00,'2025-08-08 17:09:37',0,NULL),(58,'STRAWBERRY','Sweet and tangy strawberry mojito with fresh strawberries, mint leaves, and soda for a fruity, refreshing burst.',NULL,11,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674768/menu_items/strawberrymojito.jpg',89.00,79.00,10.00,'2025-08-08 17:09:37',0,NULL),(59,'LYCHEEEE','Refreshing lychee mojito with juicy lychee pulp, mint leaves, and soda for a sweet, tropical delight.',NULL,11,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674756/menu_items/lycheemojito.jpg',89.00,79.00,10.00,'2025-08-08 17:09:37',0,NULL),(60,'MANGO','Sweet and refreshing mango mojito made with ripe mango pulp, mint leaves, and soda for a tropical burst of flavour.',NULL,11,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674744/menu_items/mangomojito.jpg',85.00,79.00,6.00,'2025-08-08 17:09:37',0,NULL),(61,'BLUE CURACAO','Cool and vibrant blue curacao mojito with mint leaves and soda for a refreshing citrusy twist.',NULL,11,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674733/menu_items/bluemojito.jpg',105.00,89.00,16.00,'2025-08-08 17:09:37',0,NULL),(63,'MOSAMBI','Fresh sweet lime juice served chilled for a naturally sweet and refreshing drink.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944803/menu_items/MOSAMBI%20HUICE.jpg',89.00,79.00,10.00,'2025-08-08 17:17:58',0,NULL),(64,'ORANGE','Freshly squeezed orange juice served chilled for a sweet, tangy, and revitalising drink.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944766/menu_items/ORANGE%20JUICE.jpg',89.00,79.00,10.00,'2025-08-08 17:17:58',0,NULL),(65,'WATERMELON','Refreshing watermelon juice served chilled for a sweet, hydrating, and cooling treat.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944688/menu_items/WATERMELON%20JUICE.jpg',89.00,79.00,10.00,'2025-08-08 17:17:58',0,NULL),(66,'MUSKMELON','Sweet and refreshing muskmelon juice served chilled for a light and cooling drink.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944652/menu_items/MUSKMELLON%20JUICE.jpg',99.00,89.00,10.00,'2025-08-08 17:17:58',0,NULL),(67,'PINEAPPLE','Tangy and sweet pineapple juice served chilled for a tropical and refreshing drink.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944614/menu_items/PINEAPPLE%20JUICE.jpg',99.00,89.00,10.00,'2025-08-08 17:17:58',0,NULL),(68,'CHIKKOO','Rich and creamy chikoo (sapota) juice served chilled for a naturally sweet and energising drink.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944516/menu_items/SAPOTA%20JUICE.jpg',99.00,89.00,10.00,'2025-08-08 17:17:58',0,NULL),(69,'PAPAYA','Smooth and nutritious papaya juice served chilled for a naturally sweet and healthy refreshment.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944485/menu_items/PAPAYA%20JUICE.jpg',99.00,89.00,10.00,'2025-08-08 17:17:58',0,NULL),(70,'POMEGRANATE','Fresh and vibrant pomegranate juice served chilled for a sweet, tangy, and antioxidant-rich drink.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944409/menu_items/POMEGRANATE%20JUICE.jpg',109.00,99.00,10.00,'2025-08-08 17:17:58',0,NULL),(71,'ABC JUICE','Apple, beetroot, and carrot juice blend for a sweet, healthy boost.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944365/menu_items/ABC-juice-recipe5.jpg',109.00,99.00,10.00,'2025-08-08 17:17:58',0,NULL),(72,'MANGO JUICE','Refreshing chilled mango juice with a smooth, sweet tropical flavour.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674252/menu_items/This%20Mango%20Lassi%20recipe%20is%20fruity%20and%20velvety%C3%A2%C2%80%C2%A6.jpg',99.00,89.00,10.00,'2025-08-08 17:17:58',0,NULL),(73,'GRAPE JUICE','Sweet and tangy grape juice served chilled for a refreshing and fruity drink.',NULL,4,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754131646/menu_items/Easy%20Grape%20Apple%20Punch%20Juicing%20Recipe%20for%20Detoxing%C3%A2%C2%80%C2%A6.jpg',99.00,89.00,10.00,'2025-08-08 17:17:58',0,NULL),(74,'TANGY TOMATO PASTA (VEG)','Pasta tossed in fresh basil pesto sauce for a rich, aromatic, and flavourful Italian delight.',NULL,9,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675399/menu_items/One-Pot%20Creamy%20Tomato%20Pasta%20Sauce%20-%20MushroomSalus%20%281%29.jpg',129.00,119.00,10.00,'2025-08-08 17:19:46',0,NULL),(75,'TANGY TOMATO PASTA (CHICKEN)','Pasta tossed in fresh basil pesto sauce for a rich, aromatic, and flavourful Italian delight.',NULL,9,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675374/menu_items/b6bab028-d58e-4ca2-abd2-d8fcdaf853c6.jpg',149.00,139.00,10.00,'2025-08-08 17:19:46',0,NULL),(76,'ALFREDA PASTA (VEG)','Creamy white sauce pasta with herbs and cheese.',NULL,9,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754489768/menu_items/Creamy%20Vegan%20Alfredo%20Pasta.jpg',144.00,139.00,5.00,'2025-08-08 17:19:46',0,NULL),(77,'ALFREDA PASTA (CHICKEN)','Creamy white sauce pasta with herbs and cheese.',NULL,9,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754489768/menu_items/Creamy%20Vegan%20Alfredo%20Pasta.jpg',169.00,159.00,10.00,'2025-08-08 17:19:46',0,NULL),(78,'PESTO PASTA (VEG)','Fresh basil pesto tossed with pasta for a rich, aromatic flavour.',NULL,9,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675180/menu_items/Creamy%20Pesto%20Pasta%20-%20My%20Daily%20Cuisine.jpg',164.00,149.00,15.00,'2025-08-08 17:19:46',0,NULL),(79,'PESTO PASTA (CHICKEN)','Fresh basil pesto tossed with pasta for a rich, aromatic flavour.',NULL,9,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675261/menu_items/chickenpestopasta.jpg',189.00,179.00,10.00,'2025-08-08 17:19:46',0,NULL),(80,'PLAIN MAGGIE','Simple and tasty Maggi noodles cooked plain for a light and comforting snack.',NULL,10,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754489974/menu_items/plain%20maggie.jpg',74.00,69.00,5.00,'2025-08-08 17:19:52',0,NULL),(81,'VEG MAGGIE','Maggi noodles cooked with fresh mixed vegetables for a tasty and wholesome snack.',NULL,10,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944308/menu_items/veg%20maggie.jpg',89.00,79.00,10.00,'2025-08-08 17:19:52',0,NULL),(82,'EGG MAGGIE','Maggi noodles cooked with scrambled eggs for a protein-rich and delicious meal.',NULL,10,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754489994/menu_items/EGG%20MAGIE.webp',104.00,89.00,15.00,'2025-08-08 17:19:52',0,NULL),(83,'CHICKEN MAGGIE','Maggi noodles cooked with tender chicken pieces for a hearty and flavourful treat.',NULL,10,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674601/menu_items/chickenmaggir.jpg',114.00,99.00,15.00,'2025-08-08 17:19:52',0,NULL),(84,'CHEESE MAGGIE (VEG)','Maggi noodles mixed with melted cheese for a creamy, cheesy, and comforting snack.',NULL,10,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754674713/menu_items/cheesemaggieveg.jpg',119.00,109.00,10.00,'2025-08-08 17:19:52',0,NULL),(85,'CHEESE MAGGIE (NON-VEG)','Maggi noodles mixed with melted cheese for a creamy, cheesy, and comforting snack.',NULL,10,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753944282/menu_items/CHEESE%20MAGGIE.jpg',129.00,119.00,10.00,'2025-08-08 17:19:52',0,NULL),(86,'VEG BURGER','Soft bun filled with crispy veg patty, fresh veggies, and creamy sauces.',NULL,14,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754488592/menu_items/This%20really%20is%20the%20best%20veggie%20burger%20I%27ve%20ever%C3%A2%C2%80%C2%A6.jpg',99.00,89.00,10.00,'2025-08-08 17:19:57',0,NULL),(87,'PANEER BURGER','Bun filled with crunchy paneer, veggies, and tangy sauces.',NULL,14,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754488728/menu_items/Experience%20the%20ultimate%20crunch%21%20This%20burger%C3%A2%C2%80%C2%A6.jpg',119.00,109.00,10.00,'2025-08-08 17:19:57',0,NULL),(88,'CHICKEN BURGER','Soft bun loaded with tender chicken, veggies, and classic spreads.',NULL,14,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754673762/menu_items/burger.jpg',139.00,119.00,20.00,'2025-08-08 17:19:57',1,NULL),(89,'SALTED FRIES (REGULAR)','Classic fries lightly salted for a crisp and golden snack.',NULL,13,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754676215/menu_items/Savory%20Seasoned%20French%20Fries%20Recipe_%20A%20Flavorful%C3%A2%C2%80%C2%A6.jpg',85.00,75.00,10.00,'2025-08-08 17:21:56',0,NULL),(90,'SALTED FRIES (LARGE)','Classic fries lightly salted for a crisp and golden snack.',NULL,13,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754490219/menu_items/A%20scrumptious%20image%20of%20a%20freshly%20prepared%20French%C3%A2%C2%80%C2%A6.jpg',149.00,139.00,10.00,'2025-08-08 17:21:56',0,NULL),(91,'PERI PERI FRIES (REGULAR)','Zesty peri peri spiced fries with a tangy twist.',NULL,13,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754490287/menu_items/Silly%2C%20Khar.jpg',95.00,85.00,10.00,'2025-08-08 17:21:56',0,NULL),(92,'PERI PERI FRIES (LARGE)','Zesty peri peri spiced fries with a tangy twist.',NULL,13,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1753945460/menu_items/peri%20peri%20french%20fries.jpg',159.00,149.00,10.00,'2025-08-08 17:21:56',0,NULL),(93,'CHEESY FRIES (REGULAR)','Fries loaded with gooey melted cheese for ultimate indulgence.',NULL,13,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754490315/menu_items/8b53fe6e-8625-423c-a590-27b1081aa083.jpg',105.00,95.00,10.00,'2025-08-08 17:21:56',0,NULL),(94,'CHEESY FRIES (LARGE)','Fries loaded with gooey melted cheese for ultimate indulgence.',NULL,13,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754490406/menu_items/0b258a08-9f9c-426d-a4ed-09b41d045fe7.jpg',169.00,159.00,10.00,'2025-08-08 17:21:56',0,NULL),(95,'HONEY LADY','Crispy waffle topped with sweet, natural honey.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754676064/menu_items/Miodowaty%20Placki%2C%20or%20Honey%20Pancakes%2C%20are%20a%C3%A2%C2%80%C2%A6.jpg',89.00,79.00,10.00,'2025-08-08 17:22:04',0,NULL),(96,'NAUGHTY NUTELLA','Warm waffle loaded with rich, creamy Nutella.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754676027/menu_items/NAUGHTY%20NUTELLA.jpg',144.00,129.00,15.00,'2025-08-08 17:22:04',0,NULL),(97,'WHITE CHOCOLATE','Soft waffle topped with smooth, melted white chocolate.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675972/menu_items/Winter%20is%20coming%20so%20whip%20up%20a%20batch%20of%20White%C3%A2%C2%80%C2%A6.jpg',129.00,119.00,10.00,'2025-08-08 17:22:04',0,NULL),(98,'DARK CHOCOLATE','Crisp waffle drizzled with bold, rich dark chocolate.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675931/menu_items/622f9428-255d-4614-a1c2-859055d6ccb5.jpg',139.00,129.00,10.00,'2025-08-08 17:22:04',1,NULL),(99,'MILK CHOCOLATE','Golden waffle coated with creamy, sweet milk chocolate.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675887/menu_items/6b23bf3e-1d61-4a95-978e-e3c47cf3f0f0.jpg',149.00,139.00,10.00,'2025-08-08 17:22:04',0,NULL),(100,'DOUBLE CHOCOLATE','Decadent waffle layered with rich dark and smooth milk chocolate.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675848/menu_items/DOUBLE%20CHOCOLATE%20PANCAKE.jpg',149.00,139.00,10.00,'2025-08-08 17:22:04',0,NULL),(101,'TRIPLE CHOCOLATE','Indulgent waffle loaded with dark, milk, and white chocolate.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675807/menu_items/TRIPLE%20CHOCOLATE%20PANCAKE.jpg',169.00,149.00,20.00,'2025-08-08 17:22:04',0,NULL),(102,'OREO THUNDER WITH ICE CREAM','Waffle topped with crushed Oreos, ice cream, and chocolate drizzle.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675729/menu_items/OREO%20THUNDER%20WITH%20ICE%20CREAM.jpg',179.00,169.00,10.00,'2025-08-08 17:22:04',0,NULL),(103,'CRAZY KITKAT WITH ICE CREAM','Waffle loaded with KitKat chunks, ice cream, and chocolate drizzle.',NULL,17,'https://res.cloudinary.com/do9cbfu5l/image/upload/v1754675684/menu_items/CRAZY%20KITKAT%20WITH%20ICE%20CREAM%20PANCAKE.jpg',179.00,169.00,10.00,'2025-08-08 17:22:04',0,NULL);
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `menu_item_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price_at_order` decimal(10,2) NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  `size` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `menu_item_id` (`menu_item_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) NOT NULL,
  `table_number` varchar(50) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `address` text,
  `items` json NOT NULL,
  `coupon_code` varchar(50) DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL,
  `instructions` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('Pending','Accepted','Cooking','Delivered','Cancelled') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `coupon_code` (`coupon_code`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_phone_number` (`phone_number`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`coupon_code`) REFERENCES `coupons` (`code`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (2,'Vasudeva reddy','9652296548',NULL,NULL,'[{\"id\": 43, \"qty\": 1, \"name\": \"CHOCO OVERLOAD\", \"price\": 119}]',NULL,119.00,0.00,119.00,'Vbhc','2025-08-12 05:03:14','2025-08-12 05:03:14','Pending'),(3,'VASU','9652296548',NULL,NULL,'[{\"id\": 48, \"qty\": 1, \"name\": \"BANANA SHAKE\", \"price\": 59}, {\"id\": 49, \"qty\": 1, \"name\": \"MUSKMELON SHAKE\", \"price\": 69}, {\"id\": 50, \"qty\": 1, \"name\": \"OREO SHAKE\", \"price\": 79}]','SHAKES30',207.00,41.40,165.60,'ALLIANCE UNIVERSITY','2025-08-12 05:44:10','2025-08-12 05:44:10','Pending'),(4,'Vasudeva reddy','9652296548',NULL,NULL,'[{\"id\": 48, \"qty\": 1, \"name\": \"BANANA SHAKE\", \"price\": 59}, {\"id\": 49, \"qty\": 1, \"name\": \"MUSKMELON SHAKE\", \"price\": 69}, {\"id\": 50, \"qty\": 1, \"name\": \"OREO SHAKE\", \"price\": 79}]','SHAKES30',207.00,41.40,165.60,'Alliance university','2025-08-12 05:47:11','2025-08-12 05:47:11','Pending'),(5,'Yedukondalu','9347582736',NULL,NULL,'[{\"id\": 37, \"qty\": 2, \"name\": \"HONEY WAFFLE\", \"price\": 69}, {\"id\": 20, \"qty\": 1, \"name\": \"CHICKEN (MEDIUM)\", \"price\": 195}]',NULL,333.00,0.00,333.00,'Hanvi pg','2025-08-12 14:40:04','2025-08-12 14:40:04','Pending'),(6,'D Jayanth Kumar Reddy','7674893406',NULL,NULL,'[{\"id\": 1, \"qty\": 1, \"name\": \"CLASSIC (REGULAR)\", \"price\": 99}, {\"id\": 5, \"qty\": 1, \"name\": \"ONION/TOMATA (MEDIUM)\", \"price\": 155}]',NULL,254.00,0.00,254.00,'BANGALORE','2025-08-12 17:04:30','2025-08-12 17:04:30','Pending');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `image` varchar(255) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotions`
--

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `top_picks`
--

DROP TABLE IF EXISTS `top_picks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `top_picks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `menu_item_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `menu_item_id` (`menu_item_id`),
  CONSTRAINT `top_picks_ibfk_1` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `top_picks`
--

LOCK TABLES `top_picks` WRITE;
/*!40000 ALTER TABLE `top_picks` DISABLE KEYS */;
/*!40000 ALTER TABLE `top_picks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `role` enum('admin','customer') NOT NULL DEFAULT 'customer',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'vasu deva','svasu18604@gmail.com','$2b$10$qW8huJCsy2JZiZjgf2bgF.a/pnqu/56wU/GYELjhuGaUdE7GIfhsu','2025-07-30 13:51:52','customer'),(2,'SUNKIREDDY GIRI','svasudevareddy18604@gmail.com','$2b$10$GhG2ea890F6OAR2rCGS0GeVXFxtFseowgFhVx3YRJcBS1CwUFIL1.','2025-07-31 15:44:50','admin'),(3,'SUNKIREDDY VASUDEVA REDDY','sgiridharreddy040707@gmail.com','$2b$10$it89/UQpOoDPvmhMWNuD9.20hNwMDFG7n5N0UjMoBskEWh0kgSSpG','2025-07-31 15:46:32','admin');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-13  9:29:10
