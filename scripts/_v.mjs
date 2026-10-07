import { neon } from "@neondatabase/serverless";
console.log(JSON.stringify(await neon(process.env.DATABASE_URL)`SELECT name, views FROM icons WHERE name = 'cat'`));
