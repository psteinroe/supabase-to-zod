import ts from 'typescript';
import { z } from 'zod';
import { getNodeName } from './get-node-name';

const enumFormatterSchema = z.function().args(z.string()).returns(z.string());

const functionFormatterSchema = z
  .function()
  .args(z.string(), z.string())
  .returns(z.string());

const tableOrViewFormatterSchema = z
  .function()
  .args(z.string(), z.string())
  .returns(z.string());

export const transformTypesOptionsSchema = z.object({
  sourceText: z.string(),
  schema: z.string().default('public'),
  enumFormatter: enumFormatterSchema.default(() => (name: string) => name),
  functionFormatter: functionFormatterSchema.default(
    () => (name: string, type: string) => `${name}${type}`
  ),
  tableOrViewFormatter: tableOrViewFormatterSchema.default(
    () => (name: string, operation: string) => `${name}${operation}`
  ),
});

export type TransformTypesOptions = z.infer<typeof transformTypesOptionsSchema>;

export const transformTypes = z
  .function()
  .args(transformTypesOptionsSchema)
  .returns(z.string())
  .implement((opts) => {
    const { schema, tableOrViewFormatter, enumFormatter, functionFormatter } =
      opts;
    const sourceFile = ts.createSourceFile(
      'index.ts',
      opts.sourceText,
      ts.ScriptTarget.Latest
    );

    const typeStrings: string[] = [];
    const enumNames: { name: string; formattedName: string }[] = [];

    sourceFile.forEachChild((n) => {
      if (ts.isTypeAliasDeclaration(n) && n.name.text === 'Database') {
        // Database
        n.forEachChild((n) => {
          if (ts.isPropertySignature(n)) {
            // Schema
            const schemaName = getNodeName(n);
            if (schemaName === schema) {
              n.forEachChild((n) => {
                if (ts.isTypeLiteralNode(n)) {
                  n.forEachChild((n) => {
                    if (ts.isPropertySignature(n) && ts.isIdentifier(n.name)) {
                      if (['Tables', 'Views'].includes(n.name.text)) {
                        n.forEachChild((n) => {
                          if (ts.isTypeLiteralNode(n)) {
                            n.forEachChild((n) => {
                              if (ts.isPropertySignature(n)) {
                                // Table or View
                                const tableOrViewName = getNodeName(n);
                                n.forEachChild((n) => {
                                  if (ts.isTypeLiteralNode(n)) {
                                    n.forEachChild((n) => {
                                      if (ts.isPropertySignature(n)) {
                                        const operation = getNodeName(n);
                                        if (operation) {
                                          n.forEachChild((n) => {
                                            if (ts.isTypeLiteralNode(n)) {
                                              typeStrings.push(
                                                `export type ${tableOrViewFormatter(
                                                  tableOrViewName,
                                                  operation
                                                )} = ${n.getText(sourceFile)}`
                                              );
                                            }
                                          });
                                        }
                                      }
                                    });
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                      if ('Enums' === n.name.text) {
                        n.forEachChild((n) => {
                          if (ts.isTypeLiteralNode(n)) {
                            n.forEachChild((n) => {
                              const enumName = getNodeName(n);
                              if (ts.isPropertySignature(n)) {
                                n.forEachChild((n) => {
                                  if (ts.isUnionTypeNode(n)) {
                                    const formattedName =
                                      enumFormatter(enumName);
                                    typeStrings.push(
                                      `export type ${formattedName} = ${n.getText(
                                        sourceFile
                                      )}`
                                    );
                                    enumNames.push({
                                      formattedName,
                                      name: enumName,
                                    });
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                      if ('Functions' === n.name.text) {
                        n.forEachChild((n) => {
                          if (ts.isTypeLiteralNode(n)) {
                            n.forEachChild((n) => {
                              if (ts.isPropertySignature(n)) {
                                const functionName = getNodeName(n);
                                n.forEachChild((n) => {
                                  if (ts.isTypeLiteralNode(n)) {
                                    n.forEachChild((n) => {
                                      if (ts.isPropertySignature(n)) {
                                        const argType = getNodeName(n);
                                        n.forEachChild((n) => {
                                          if (ts.isTypeReferenceNode(n)) {
                                            typeStrings.push(
                                              `export type ${functionFormatter(
                                                functionName,
                                                argType
                                              )} = ${n.getText(sourceFile)}`
                                            );
                                          }
                                        });
                                      }
                                    });
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    }
                  });
                }
              });
            }
          }
        });
      }
      if (ts.isTypeAliasDeclaration(n) && n.name.text === 'Json') {
        typeStrings.push(n.getText(sourceFile));
      }
    });

    let parsedTypes = typeStrings
      .filter((s) => !s.includes('Record<number'))
      .join(';\n');

    for (const { name, formattedName } of enumNames) {
      parsedTypes = parsedTypes.replaceAll(
        `Database["${schema}"]["Enums"]["${name}"]`,
        formattedName
      );
      parsedTypes = parsedTypes.replaceAll(
        `Database['${schema}']['Enums']['${name}']`,
        formattedName
      );
    }

    return parsedTypes;
  });
