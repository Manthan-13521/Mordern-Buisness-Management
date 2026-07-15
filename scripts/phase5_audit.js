const { Project, SyntaxKind } = require("ts-morph");

const project = new Project();
project.addSourceFilesAtPaths("app/api/**/*.ts");

for (const sourceFile of project.getSourceFiles()) {
    let modified = false;
    sourceFile.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.CallExpression) {
            const expression = node.getExpression();
            if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
                const name = expression.getName();
                if (name === "find") {
                    const parentText = node.getParent().getText();
                    if (!parentText.includes("limit(")) {
                        console.log(`${sourceFile.getFilePath()}: Missing limit() on find()`);
                    }
                }
            }
        }
    });
}
