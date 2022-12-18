import ts from 'typescript';

export const getNodeName = (n: ts.Node) => {
  let name: string | undefined;
  n.forEachChild((n) => {
    if (ts.isIdentifier(n)) {
      name = n.text;
    }
  });
  if (!name) throw new Error('Cannot get name of node');
  return name;
};
