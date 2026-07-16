const { Project, SyntaxKind } = require('ts-morph');

const project = new Project();
project.addSourceFilesAtPaths("app/api/**/route.ts");

let modifiedFiles = 0;

for (const sourceFile of project.getSourceFiles()) {
    let hasModification = false;

    // Get all exported functions (GET, POST, PUT, DELETE, PATCH)
    const functions = sourceFile.getFunctions().filter(f => 
        f.isExported() && 
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(f.getName())
    );

    for (const func of functions) {
        const body = func.getBody();
        if (!body) continue;

        const bodyText = body.getText();
        if (bodyText.includes('requestContext.run')) continue;

        // If function has no parameters, add 'req: Request'
        let params = func.getParameters();
        if (params.length === 0) {
            func.addParameter({
                name: 'req',
                type: 'Request'
            });
            params = func.getParameters();
        }
        const reqName = params[0].getName();

        // Get inner statements of the function
        const innerStatements = body.getStatements().map(s => s.getText()).join('\n');

        // We wrap the inner body with requestContext.run
        const newBody = `
    const requestId = ${reqName} ? (${reqName}.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
    const clientIp = ${reqName} ? (${reqName}.headers.get("x-forwarded-for")?.split(",")[0].trim() || ${reqName}.headers.get("x-real-ip") || "unknown") : "unknown";
    const routePath = ${reqName} ? new URL(${reqName}.url).pathname : "unknown";
    const requestMethod = "${func.getName()}";

    return requestContext.run({
        requestId,
        ip: clientIp,
        route: routePath,
        method: requestMethod,
        startTime: Date.now()
    }, async () => {
        ${innerStatements}
    });
        `;

        func.setBodyText(newBody);
        hasModification = true;
    }

    if (hasModification) {
        // Add requestContext import
        const imports = sourceFile.getImportDeclarations();
        const hasContextImport = imports.some(i => i.getModuleSpecifierValue() === "@/lib/requestContext");
        if (!hasContextImport) {
            sourceFile.addImportDeclaration({
                namedImports: ["requestContext"],
                moduleSpecifier: "@/lib/requestContext"
            });
        }
        
        sourceFile.saveSync();
        modifiedFiles++;
        console.log(`Wrapped ${sourceFile.getFilePath()}`);
    }
}

console.log(`Successfully wrapped ${modifiedFiles} files.`);
