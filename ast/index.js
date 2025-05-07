const ts = require('typescript')
const path = require('path')
const fs = require('fs')
const fastGlob = require('fast-glob')
const tsConfigPaths = require('tsconfig-paths');

const projectRoot = '../game'
const gameTsCom = []

// 匹配所有 TypeScript 文件
async function readFile() {

  const tsFiles = await fastGlob([`${projectRoot}/**/*.ts`, `!${projectRoot}/**/*.d.ts`, '!node_modules/**']);

  tsFiles.forEach(item => {
    gameTsCom.push(item)
  })
}

// 找到tsconfig文件
function findTsConfig() {
  const configPath = ts.findConfigFile(
    projectRoot,
    ts.sys.fileExists,
    'tsconfig.json'
  );  

  if (!configPath) throw new Error('未找到 tsconfig.json');

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const compilerOptions = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  ).options;

  return compilerOptions
}

// 新增工具函数：判断是否为第三方包
function isExternalModule(importPath, compilerOptions) {
  // 情况1：相对路径或绝对路径
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return false;
  }

  // 情况2：包含文件扩展名（如 .ts、.js）
  if (path.extname(importPath)) {
    return false;
  }

  // 情况3：检查 TypeScript 路径别名（需解析 tsconfig.json 的 compilerOptions.paths）
  const tsPaths = compilerOptions?.paths || {};
  const pathKeys = Object.keys(tsPaths);

  for (const key of pathKeys) {
    // 如果导入路径匹配别名前缀（如 '@/*' 匹配 '@/utils'）
    if (importPath.startsWith(key.replace('/*', ''))) {
      return false;
    }
  }

  return true;
}

// 分析文件的依赖
function analyzeFileDependencies(compilerOptions) {
  const program = ts.createProgram(
    // 所有 TypeScript 文件
    gameTsCom, 
    // 来自 tsconfig.json 的配置
    compilerOptions
  )

  // 获取所有 SourceFile（AST 的根节点）
  const sourceFiles = program.getSourceFiles();
  const allAstResults = [];

  // 生成单个文件的 AST
  sourceFiles.forEach((sourceFile) => {
    if (sourceFile.isDeclarationFile) return;
    const astJson = {
      fileName: path.basename(sourceFile.fileName),
      path: sourceFile.path,
      externalImports: [],  // 第三方包
      internalImports: [],  // 本地文件
      functions: [],
    };

    const visit = (node) => {
      // 处理静态导入
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          if (isExternalModule(moduleSpecifier.text, compilerOptions)) {
            astJson.externalImports.push(moduleSpecifier.text)
          } else {
            astJson.internalImports.push(moduleSpecifier.text)
          }
        }
      }

      // 处理动态导入
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const importArg = node.arguments[0];
        if (importArg && ts.isStringLiteral(importArg)) {
          if (isExternalModule(importArg.text, compilerOptions)) {
            astJson.externalImports.push(importArg.text)
          } else {
            astJson.internalImports.push(importArg.text)
          }
        }
      }

      // 处理函数声明（具名或匿名）
      if (ts.isFunctionDeclaration(node)) {
        const name = node.name?.text || 'anonymous';
        astJson.functions.push(name);
      }

      // 处理默认导出的匿名函数表达式（export default function() {}）
      if (ts.isExportAssignment(node)) {
        const expr = node.expression;
        if (ts.isFunctionExpression(expr)) {
          const name = expr.name?.text || 'default_anonymous';
          astJson.functions.push(name);
        }
      }

      // 处理变量声明中的函数表达式（如 const fn = function() {}）
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (decl.initializer && ts.isFunctionExpression(decl.initializer)) {
            const name = decl.name.getText();
            astJson.functions.push(name);
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    allAstResults.push(astJson)
  });

  return allAstResults
}

// 补全扩展名的工具函数
function resolveWithExtensions(basePath) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
  for (const ext of extensions) {
    const fullPath = `${basePath}${ext}`;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

// 解析单个导入路径
function resolveImportPath(importPath, currentFilePath, pathsMatcher) {
  let resolvedPath = '';

  // 处理内部依赖
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    // 解析相对/绝对路径
    resolvedPath = path.resolve(path.dirname(currentFilePath), importPath);
  } else {
    // 处理路径别名
    resolvedPath = pathsMatcher(importPath, undefined, undefined, ['.ts', '.tsx']) || '';
  }

  // 补全扩展名
  if (resolvedPath) {
    const withExt = resolveWithExtensions(resolvedPath);
    return withExt || resolvedPath; // 返回可能带扩展名的路径
  }

  // 处理外部依赖
  try {
    return require.resolve(importPath, { paths: [currentFilePath] });
  } catch (error) {
    return `未找到模块: ${importPath}`;
  }
}


// 写json
function writeJson(allASTJSON, compilerOptions) {
  // 初始化路径匹配器
  const pathsMatcher = tsConfigPaths.createMatchPath(
    compilerOptions.baseUrl || '.',
    compilerOptions.paths || {}
  );
  allASTJSON.forEach(astJson => {
    // 解析所有依赖
    const internalImports = []
    astJson.internalImports.forEach(item => {
      const fullPath = resolveImportPath(item, astJson.fileName, pathsMatcher);
      internalImports.push(fullPath)
    })
    astJson.internalImports = internalImports

    // 保存到文件
    const outputPath = path.join('../game-json', path.basename(astJson.fileName) + '.json');
    fs.writeFileSync(outputPath, JSON.stringify(astJson, null, 2));
  }) 

  // 写入整个json
  const outputPath = path.join('../game-json', 'all.json');
  fs.writeFileSync(outputPath, JSON.stringify(allASTJSON, null, 2));
}

async function main() {
  await readFile()
  const compilerOptions = findTsConfig()
  const allASTJSON = analyzeFileDependencies(compilerOptions)
  writeJson(allASTJSON, compilerOptions)
}

main()