# Working with Unions Within Prisma

Unions help us define a value as one or more types. Sometimes this makes data easier to rationalize and makes it easier to represent our reality and the domains we're exploring. A common one I think about is how the United States uses the word `state`, where in Canada they use the word `province` to roughly describe the same thing. The union of the two being something like a `stateOrProvinceSpecificer: "state" | "province"`, a union of two constant strings.

Sometimes our data just better fits as a structured union and even across primative types like `boolean | number` or interface types like `article | photo`. Here's an deep-dive into unions within prisma. Prisma currently doesn’t support union types in the schema, but there are some ways we can work around this.

## Creating the Schema

Touching on our `state` vs `province` example, and borrowing from this [schema here](https://github.com/prisma/prisma/issues/2505#issuecomment-1045344408), let's say we wanted to create a `Place` table that is the union of a `City` or a `Country`. Perhaps we're building a map were the specificity doesn't need to matter, or a set of destinations. Here both are nullable which allows us to use them as unions, but also opens up the database to some other unitended circumstances, in this case both can be null, and both can be set 😬. We won't explore options for remedying this in this article, but there are other provisions that can be explored at the postgres level, as well as the API layer to ensure this doesn't happen.

```prisma
model Place {
  id           Int       @default(autoincrement()) @id
  city         City?     @relation(fields: [cityId], references: [id])
  cityId       Int?
  country      Country?  @relation(fields: [countryId], references: [id])
  countryId    Int?
}
```

We can expand out the `City` and `Country` models as well. Here I also added a bit of recursion a `City` also has an associated `Country`.

```prisma
model City {
  id           Int       @default(autoincrement()) @id
  name         String    @unique
  places       Place[]
  country      Country   @relation(fields: [countryId], references: [id])
  countryId    Int
}

model Country {
  id           Int       @default(autoincrement()) @id
  name         String    @unique
  places       Place[]
  cities       City[]
}
```

With all of this placed neatly within `schema.prisma` we can run `npx prisma migrate dev --name init` to migrate the schema and setup the database. I'm using a local postgres database. My `.env` file has something like this:

```shell
DATABASE_URL="postgresql://thomasreggi:thomasreggi@localhost:5432/prisma-demo?schema=public"
```

## Seeding the Database

Now that our database is ready, and the Prisma types have been generated we can seed the database with some dummy data. I've created a script that will create two cities, `New York` and `Berlin` and three countries `United States`, `France` and `Germany`. To seed the database run `npm tsx seed.ts`. 

## Querying the Union

Now we can get to the jucy part. We can query the `Place` table and massage the Typescript types to more accuratley represent the union we want to work with. We want to `include` both `City` and `Country` but also include the recursive aspect of `City.Country`, this can be down with an added nested include.

```ts
const result = await prisma.place.findFirst({
  where: { id },
  include: {
    city: {
      include: {
        country: true
      }
    },
    country: true
  }
})
```

What's super useful now that we've written this out is that prisma will automatically define the return type of the find when you hover over `result` you get this:

```ts
type PlaceResult = (Prisma.Place & {
  country: Prisma.Country | null;
  city: (Prisma.City & {
    country: Prisma.Country;
  }) | null;
}) | null
```

> Note: Here I importer prisma as `import Prisma from '@prisma/client'` that way I keep prisma types scoped neatly within `Prisma.` and can define my own versions of all the types without confusion.

![shows typescript return type when hover](./type-hover.png)

Given that we want to explore a `Place` being a union of both `City` and `Country` this `result` type isn't exactly that. It's an object that can either have a `country` or a `city`, in fact it __could__ have both or neither, which is problematic. We can fix this by wrapping the `create` and `find` functions and ensuring that when things are created in the database and when things are read out the structure of the data is as we'd expect. 

## Creating a Typesafe Union

Because the example here of `City` and `Country` is a union of interfaces there's an advantage to knowing wheather or not the Place is a `City` or a `Country` from a runtime perspective. One way to do this is to have add a `type` property to the interfaces. This will allow us to conditionally do different things depending on if it's a `City` or a `Country`. We can wrap the prisma types like this:

```ts
import Prisma from '@prisma/client'

type Country = Prisma.Country & { type: 'country' }
type City = Prisma.City & { type: 'city', country: Country }
type Place = City | Country
```

Here I'm imporing prisma like this `import Prisma from '@prisma/client'` and not `import { Country, City, Place} from '@prisma/client'` because if we imported the types directly we'd be colliding with them in creating these new union-compatable alternaitves.

Voila! `Place` is now a perfect union of `City` and `Country`.

Now that we have all the necessary types we can reuse the type return from Prisma's find `PlaceResult` that we defined above and transform it. This converts the object with `.city` or `.country` to a union with out added `type` property which will come in handy in a bit.

```ts
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
```

Now we can write a new `find` function putting all we've learned together:

```ts
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
```

Now when we call this `find` we get a `place` variable that has the type `Place | null` and we can easily acess that country only for `city`.

```ts
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
```

## Conclusion 

Unions help us structure our data to be more in alignment with how we see the world, and how our domain models function. By making two columns nullable and transformaing the return value from the database we can  explore unions in Typescript. 