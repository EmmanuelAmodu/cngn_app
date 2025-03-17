-- CreateTable
CREATE TABLE `VirtualAccount` (
    `user_address` VARCHAR(191) NOT NULL,
    `account_name` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_address`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Onramp` (
    `onramp_id` VARCHAR(191) NOT NULL,
    `user_address` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `chain_id` INTEGER NULL,
    `on_chain_tx` VARCHAR(191) NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed', 'queued') NOT NULL DEFAULT 'pending',
    `payment_reference` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Onramp_payment_reference_key`(`payment_reference`),
    INDEX `idx_onramps_user_address`(`user_address`),
    PRIMARY KEY (`onramp_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Offramp` (
    `offramp_id` VARCHAR(191) NOT NULL,
    `user_address` VARCHAR(191) NOT NULL,
    `bank_account` VARCHAR(191) NOT NULL,
    `bank_code` VARCHAR(191) NOT NULL,
    `chain_id` INTEGER NOT NULL,
    `on_chain_tx` VARCHAR(191) NULL,
    `bank_transfer_reference` VARCHAR(191) NULL,
    `recipient_id` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed', 'queued') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Offramp_bank_transfer_reference_key`(`bank_transfer_reference`),
    INDEX `idx_offramps_user_address`(`user_address`),
    INDEX `idx_offramps_status`(`status`),
    PRIMARY KEY (`offramp_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bridge` (
    `bridge_id` VARCHAR(191) NOT NULL,
    `user_address` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `source_chain_id` INTEGER NOT NULL,
    `destination_chain_id` INTEGER NOT NULL,
    `source_tx_hash` VARCHAR(191) NULL,
    `destination_tx_hash` VARCHAR(191) NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed', 'queued') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_bridges_user_address`(`user_address`),
    INDEX `idx_bridges_status`(`status`),
    PRIMARY KEY (`bridge_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Onramp` ADD CONSTRAINT `Onramp_user_address_fkey` FOREIGN KEY (`user_address`) REFERENCES `VirtualAccount`(`user_address`) ON DELETE RESTRICT ON UPDATE CASCADE;
