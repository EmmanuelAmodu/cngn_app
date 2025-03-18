-- CreateTable
CREATE TABLE `User` (
    `address` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `mobile_number` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_mobile_number_key`(`mobile_number`),
    PRIMARY KEY (`address`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VirtualAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userAddress` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `routing_number` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `currency` ENUM('NGN', 'USD', 'KES', 'EUR', 'GBP') NOT NULL DEFAULT 'NGN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `VirtualAccount_userAddress_idx`(`userAddress`),
    UNIQUE INDEX `VirtualAccount_userAddress_currency_key`(`userAddress`, `currency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `transaction_id` VARCHAR(191) NOT NULL,
    `type` ENUM('onramp', 'offramp', 'bridge') NOT NULL,
    `user_address` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` ENUM('NGN', 'USD', 'KES', 'EUR', 'GBP') NOT NULL,
    `status` ENUM('pending', 'processing', 'completed', 'failed', 'queued') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `payment_reference` VARCHAR(191) NULL,
    `chain_id` INTEGER NULL,
    `on_chain_tx` VARCHAR(191) NULL,
    `bank_account` VARCHAR(191) NULL,
    `bank_code` VARCHAR(191) NULL,
    `bank_transfer_reference` VARCHAR(191) NULL,
    `recipient_id` VARCHAR(191) NULL,
    `source_chain_id` INTEGER NULL,
    `destination_chain_id` INTEGER NULL,
    `source_tx_hash` VARCHAR(191) NULL,
    `destination_tx_hash` VARCHAR(191) NULL,

    UNIQUE INDEX `Transaction_payment_reference_key`(`payment_reference`),
    UNIQUE INDEX `Transaction_bank_transfer_reference_key`(`bank_transfer_reference`),
    INDEX `idx_transactions_user_address`(`user_address`),
    INDEX `idx_transactions_status`(`status`),
    INDEX `idx_transactions_type`(`type`),
    INDEX `idx_transactions_currency`(`currency`),
    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VirtualAccount` ADD CONSTRAINT `VirtualAccount_userAddress_fkey` FOREIGN KEY (`userAddress`) REFERENCES `User`(`address`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_user_fkey` FOREIGN KEY (`user_address`) REFERENCES `User`(`address`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_virtual_account_fkey` FOREIGN KEY (`user_address`, `currency`) REFERENCES `VirtualAccount`(`userAddress`, `currency`) ON DELETE RESTRICT ON UPDATE CASCADE;
