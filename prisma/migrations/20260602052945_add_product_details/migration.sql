-- AlterTable
ALTER TABLE `Product` ADD COLUMN `allergens` VARCHAR(191) NULL,
    ADD COLUMN `certifications` VARCHAR(191) NULL,
    ADD COLUMN `country_of_origin` VARCHAR(191) NULL,
    ADD COLUMN `disclaimer` TEXT NULL,
    ADD COLUMN `ingredients` TEXT NULL,
    ADD COLUMN `legal_info` TEXT NULL,
    ADD COLUMN `manufacturer` VARCHAR(191) NULL,
    ADD COLUMN `nutrition_json` TEXT NULL,
    ADD COLUMN `serving_size` VARCHAR(191) NULL,
    ADD COLUMN `shelf_life` VARCHAR(191) NULL,
    ADD COLUMN `sku` VARCHAR(191) NULL,
    ADD COLUMN `storage_instructions` VARCHAR(191) NULL,
    ADD COLUMN `tags` VARCHAR(191) NULL,
    ADD COLUMN `usage_instructions` TEXT NULL,
    ADD COLUMN `video_url` VARCHAR(191) NULL,
    ADD COLUMN `weight_volume` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductImage_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
