import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.place.create({
    data: {
      city: {
        create: {
          name: 'New York',
          country: {
            create: {
              name: 'United States'
            }
          }
        }
      }
    }
  })

  await prisma.place.create({
    data: {
      city: {
        create: {
          name: 'Berlin',
          country: {
            create: {
              name: 'Germany'
            }
          }
        }
      }
    }
  })

  await prisma.place.create({
    data: {
      country: {
        create: {
          name: 'France',
        }
      }
    }
  })

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