const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const idFields = ['staffId', 'memberId', 'userId', 'poolId', 'hostelId', 'businessId', 'paymentId', 'expenseId', 'competitionId', 'noticeId', 'visitorId', 'planId', 'roomId', 'bedId', 'subscriptionId', 'id', 'labourId', 'customerId'];

const project = new Project();
project.addSourceFilesAtPaths("app/api/**/route.ts");

let modifiedFiles = 0;

for (const sourceFile of project.getSourceFiles()) {
    let hasModification = false;
    let injectedImport = false;

    // Get all exported functions (GET, POST, PUT, DELETE, PATCH)
    const functions = sourceFile.getFunctions().filter(f => 
        f.isExported() && 
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(f.getName())
    );

    for (const func of functions) {
        let variablesToValidate = new Set();
        const block = func.getBody();
        if (!block) continue;

        // Find VariableDeclarations that extract our ids
        const varDecls = block.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
        
        for (const decl of varDecls) {
            const nameNode = decl.getNameNode();
            const init = decl.getInitializer();
            
            // Check if initializer is await req.json() or await props.params or params
            if (!init) continue;
            const initText = init.getText();
            
            if (
                initText.includes('req.json()') || 
                initText.includes('params') || 
                initText.includes('props.params') ||
                initText.includes('searchParams.get')
            ) {
                if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
                    const elements = nameNode.getElements();
                    for (const el of elements) {
                        const name = el.getName();
                        if (idFields.includes(name)) {
                            variablesToValidate.add(name);
                        }
                    }
                } else if (nameNode.getKind() === SyntaxKind.Identifier) {
                    const name = nameNode.getText();
                    if (idFields.includes(name) && initText.includes('searchParams.get')) {
                        variablesToValidate.add(name);
                    }
                }
            }
        }

        // Search for individual assignments like const id = params.id
        const propertyAccesses = block.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
        for (const prop of propertyAccesses) {
            const exp = prop.getExpression().getText();
            const name = prop.getName();
            if ((exp === 'params' || exp.endsWith('.params')) && idFields.includes(name)) {
                // Find parent variable declaration
                const parentVar = prop.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
                if (parentVar) {
                    variablesToValidate.add(parentVar.getName());
                }
            }
        }

        if (variablesToValidate.size > 0) {
            const validationBlock = `
    if (!areValidObjectIds([${Array.from(variablesToValidate).join(', ')}])) {
        return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
            `;
            
            // Check if it already has validation
            const text = block.getText();
            if (!text.includes('areValidObjectIds') && !text.includes('isValidObjectId')) {
                // Find the best place to insert: Right after the variables are defined
                // We'll just insert at the beginning of the try block if it exists, or beginning of function
                const tryStatements = block.getDescendantsOfKind(SyntaxKind.TryStatement);
                
                // For simplicity, find the last variable declaration that we found and insert after its statement
                let lastVarStmt = null;
                for (const decl of varDecls) {
                    const nameNode = decl.getNameNode();
                    if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
                        const hasId = nameNode.getElements().some(el => variablesToValidate.has(el.getName()));
                        if (hasId) {
                            lastVarStmt = decl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
                        }
                    }
                }

                if (lastVarStmt) {
                    lastVarStmt.getParent().insertStatements(lastVarStmt.getChildIndex() + 1, validationBlock);
                    hasModification = true;
                } else if (tryStatements.length > 0) {
                    tryStatements[0].getTryBlock().insertStatements(0, validationBlock);
                    hasModification = true;
                } else {
                    block.insertStatements(0, validationBlock);
                    hasModification = true;
                }
            }
        }
    }

    if (hasModification) {
        // Add imports
        const imports = sourceFile.getImportDeclarations();
        const hasValidObjectIdImport = imports.some(i => i.getModuleSpecifierValue() === "@/lib/objectId");
        if (!hasValidObjectIdImport) {
            sourceFile.addImportDeclaration({
                namedImports: ["isValidObjectId", "areValidObjectIds"],
                moduleSpecifier: "@/lib/objectId"
            });
        }
        
        const hasNextResponseImport = imports.some(i => i.getModuleSpecifierValue() === "next/server" && i.getNamedImports().some(ni => ni.getName() === "NextResponse"));
        if (!hasNextResponseImport) {
            sourceFile.addImportDeclaration({
                namedImports: ["NextResponse"],
                moduleSpecifier: "next/server"
            });
        }

        sourceFile.saveSync();
        modifiedFiles++;
        console.log(`Modified ${sourceFile.getFilePath()}`);
    }
}

console.log(`Successfully modified ${modifiedFiles} files.`);
