import { generate } from 'ts-to-zod';

import fs from 'node:fs/promises';
import { join } from 'node:path';
import prettier from 'prettier';

import { z } from 'zod';
import {
  transformTypes,
  getImportPath,
  transformTypesOptionsSchema,
} from './lib';

const simplifiedJSDocTagSchema = z.object({
  name: z.string(),
  value: z.string().optional(),
});

const getSchemaNameSchema = z.function({
  input: [z.string()],
  output: z.string(),
});

const nameFilterSchema = z.function({
  input: [z.string()],
  output: z.boolean(),
});

const jSDocTagFilterSchema = z.function({
  input: [z.array(simplifiedJSDocTagSchema)],
  output: z.boolean(),
});

export const supabaseToZodOptionsSchema = transformTypesOptionsSchema
  .omit({ sourceText: true })
  .extend({
    input: z.string(),
    output: z.string(),
    skipValidation: z.boolean().optional(),
    maxRun: z.number().optional(),
    nameFilter: nameFilterSchema.optional(),
    jsDocTagFilter: jSDocTagFilterSchema.optional(),
    getSchemaName: getSchemaNameSchema.optional(),
    keepComments: z.boolean().optional().default(false),
    skipParseJSDoc: z.boolean().optional().default(false),
  });

export type SupabaseToZodOptions = z.infer<typeof supabaseToZodOptionsSchema>;

export default async function supabaseToZod(opts: SupabaseToZodOptions) {
  const inputPath = join(process.cwd(), opts.input);
  const outputPath = join(process.cwd(), opts.output);

  const sourceText = await fs.readFile(inputPath, 'utf-8');

  const parsedTypes = transformTypes({ sourceText, ...opts });

  const { getZodSchemasFile, errors } = generate({
    sourceText: parsedTypes,
    ...opts,
  });

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  const zodSchemasFile = getZodSchemasFile(
    getImportPath(outputPath, inputPath),
  );

  const prettierConfig = await prettier.resolveConfig(process.cwd());

  let data = await prettier.format(zodSchemasFile, {
    parser: 'babel-ts',
    ...prettierConfig,
  });

  /**
   * In Zod v4, ZodSchema has been deprecated and aliased to ZodType.
   * However, "generate" function currently still outputs ZodSchema.
   * While ZodSchema is still technically available,
   * using ZodType is the recommended approach for generic constraints and type inference in Zod v4 and beyond.
   *
   * Until the "ts-to-zod" package updates to reflect this change,
   * we will manually replace ZodSchema with ZodType here.
   */
  data = data.replace('ZodSchema', 'ZodType');

  await fs.writeFile(outputPath, data);
}
