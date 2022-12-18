# supabase-to-zod

<div align="center">
  <img src="assets/supabase-to-zod-logo.jpg" width="200px" align="center" />
  <h1 align="center">supabase-to-zod</h1>
</div>

Generate [Zod](https://github.com/colinhacks/zod) schemas (v3) from Typescript types generated by the Supabase CLI.

[![Version](https://img.shields.io/npm/v/supabase-to-zod.svg)](https://npmjs.org/package/supabase-to-zod)
[![License](https://img.shields.io/npm/l/supabase-to-zod.svg)](https://github.com/psteinroe/supabase-to-zod/blob/main/LICENSE)

## Usage

```sh
$ pnpm add --D supabase-to-zod
$ supabase gen types typescript --local > types.ts
$ pnpm supabase-to-zod --input types.ts --output schemas.ts
```

That's it, go to `schema.ts` file, you should have a schema for all tables, views, enums and functions.
