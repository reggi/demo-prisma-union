import { PrismaClient } from '@prisma/client'
import Prisma from '@prisma/client'

const prisma = new PrismaClient()

type PlaceResult = (Prisma.Place & {
  country: Prisma.Country | null;
  city: (Prisma.City & {
    country: Prisma.Country;
  }) | null;
}) | null

type Country = Prisma.Country & { type: 'country' }
type City = Prisma.City & { type: 'city', country: Country }
type Place = City | Country

function transformPlaceUnion (result: PlaceResult): Place | null {
  if (result?.city) {
    return {
      ...result.city,
      type: 'city',
      country: { type: 'country', ...result.city.country }
    }
  }
  if (result?.country) return { ...result.country, type: 'country'}
  return null
}
async function find (id: number): Promise<Place | null> {
  const result = await prisma.place.findFirst({
    where: { id},
    include: {
      city: {
        include: {
          country: true
        }
      },
      country: true
    }
  })
  return transformPlaceUnion(result)
}

async function main() {
  const place = await find(1)

  if (!place) {
    console.log('Place not found')
    return
  } else {
    console.log(place.name)
    console.log(place.type)
  }

  if (place.type === 'city') {
    // ✅ type safety works here
    console.log(place.country.name)
  }

  if (place.type === 'country') {
  // ❌ type safety works here and will throw error country doesn't have a country
    // console.log(place.country.name)
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