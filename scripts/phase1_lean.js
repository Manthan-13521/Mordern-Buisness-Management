const { Project, SyntaxKind } = require('ts-morph');

const project = new Project();
project.addSourceFilesAtPaths("app/api/**/*.ts");

let modifiedFiles = 0;
let leanAdded = 0;

for (const sourceFile of project.getSourceFiles()) {
    let hasModification = false;

    // To avoid invalidating nodes when replacing text, we can iterate in reverse order of position
    let madeChangeInPass;
    do {
        madeChangeInPass = false;
        const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
        
        for (const callExpr of callExpressions) {
            const expression = callExpr.getExpression();
            
            if (expression.getKind() !== SyntaxKind.PropertyAccessExpression) continue;
            
            const propAccess = expression;
            const methodName = propAccess.getName();

            if (['find', 'findOne', 'findById'].includes(methodName)) {
                let parent = callExpr.getParent();
                let isMongooseChain = false;
                let highestChainNode = callExpr;

                while (
                    parent.getKind() === SyntaxKind.PropertyAccessExpression ||
                    parent.getKind() === SyntaxKind.CallExpression ||
                    parent.getKind() === SyntaxKind.AwaitExpression ||
                    parent.getKind() === SyntaxKind.AsExpression
                ) {
                    if (parent.getKind() === SyntaxKind.PropertyAccessExpression && parent.getName() === 'lean') {
                        isMongooseChain = true;
                        break;
                    }
                    
                    if (
                        parent.getKind() === SyntaxKind.CallExpression &&
                        parent.getExpression().getKind() === SyntaxKind.PropertyAccessExpression &&
                        parent.getExpression().getName() === 'lean'
                    ) {
                        isMongooseChain = true;
                        break;
                    }

                    if (parent.getKind() === SyntaxKind.AwaitExpression) {
                        highestChainNode = parent.getExpression();
                        break;
                    }
                    
                    parent = parent.getParent();
                }

                if (isMongooseChain) continue;
                
                let isSafe = true;
                const varDecl = callExpr.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
                if (varDecl) {
                    const nameNode = varDecl.getNameNode();
                    if (nameNode.getKind() === SyntaxKind.Identifier) {
                        const varName = nameNode.getText();
                        const block = varDecl.getFirstAncestorByKind(SyntaxKind.Block);
                        if (block) {
                            const saves = block.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
                                .filter(pa => {
                                    return pa.getExpression().getText() === varName && 
                                          (pa.getName() === 'save' || pa.getName() === 'remove');
                                });
                            if (saves.length > 0) {
                                isSafe = false;
                            }
                        }
                    }
                }

                const awaitExpr = callExpr.getFirstAncestorByKind(SyntaxKind.AwaitExpression);
                if (awaitExpr && isSafe) {
                    // Check if there is already a `.session()` call, if so, be careful, but lean() works with session()
                    if (highestChainNode.getKind() === SyntaxKind.AsExpression) {
                        const inner = highestChainNode.getExpression();
                        inner.replaceWithText(`${inner.getText()}.lean()`);
                    } else {
                        highestChainNode.replaceWithText(`${highestChainNode.getText()}.lean()`);
                    }
                    hasModification = true;
                    leanAdded++;
                    madeChangeInPass = true;
                    break; // break the for loop, restart do-while to get fresh nodes
                }
            }
        }
    } while (madeChangeInPass);

    if (hasModification) {
        sourceFile.saveSync();
        modifiedFiles++;
    }
}

console.log(`Phase 1: Added .lean() to ${leanAdded} queries across ${modifiedFiles} files.`);
