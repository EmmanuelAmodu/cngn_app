import { PrismaClient, Currency } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const virtualAccounts = [
    {
      userAddress: "0x115f1c4833271530a51cfe4e3fb6bd973824549c",
      accountName: "PEPPER/ADESINA JOSHUA",
      accountNumber: "9774898431",
      bankName: "Wema Bank",
      reference: "251377978",
      createdAt: new Date("2025-03-14 07:54:18.718"),
      currency: Currency.NGN
    },
    {
      userAddress: "0x6f6623b00b0b2eaefa47a4fde06d6931f7121722",
      accountName: "PEPPER/AMODU EMMANUEL",
      accountNumber: "9774840320",
      bankName: "Wema Bank",
      reference: "250508647",
      createdAt: new Date("2025-03-12 15:29:21.387"),
      currency: Currency.NGN
    },
    {
      userAddress: "0xA1D2fc16b435F91295420D40d6a98bB1302080D9",
      accountName: "PEPPERTECHNOL/AMODU EMMANUEL",
      accountNumber: "9321003668",
      bankName: "Wema Bank",
      reference: "252450763",
      createdAt: new Date("2025-03-17 09:56:40.309"),
      currency: Currency.NGN
    },
    {
      userAddress: "0xece98a3113e6f0efa9c0abbcec184e022f7f6cf5",
      accountName: "PEPPER/AMODU EMMANUEL",
      accountNumber: "9774889156",
      bankName: "Wema Bank",
      reference: "251131561",
      createdAt: new Date("2025-03-13 20:03:16.998"),
      currency: Currency.NGN
    }
  ];

  // First create users for each virtual account
  for (const account of virtualAccounts) {
    const user = await prisma.user.upsert({
      where: {
        address: account.userAddress.toLowerCase()
      },
      update: {},
      create: {
        address: account.userAddress.toLowerCase(),
        firstName: account.accountName.split('/')[1].split(' ')[0],
        lastName: account.accountName.split('/')[1].split(' ')[1],
        email: `${account.userAddress.toLowerCase()}@example.com`,
        mobileNumber: `+234${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        createdAt: account.createdAt,
        updatedAt: account.createdAt
      }
    });

    console.log(`Created/Updated user: ${user.address}`);
  }

  // Then create virtual accounts
  for (const account of virtualAccounts) {
    const virtualAccount = await prisma.virtualAccount.upsert({
      where: {
        unique_user_currency: {
          userAddress: account.userAddress.toLowerCase(),
          currency: account.currency
        }
      },
      update: {
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        bankName: account.bankName,
        reference: account.reference,
        createdAt: account.createdAt,
        updatedAt: account.createdAt
      },
      create: {
        userAddress: account.userAddress.toLowerCase(),
        accountName: account.accountName,
        accountNumber: account.accountNumber,
        bankName: account.bankName,
        reference: account.reference,
        currency: account.currency,
        createdAt: account.createdAt,
        updatedAt: account.createdAt
      }
    });

    console.log(`Created/Updated virtual account: ${virtualAccount.accountNumber}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 