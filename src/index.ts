import * as fs from "fs";


import * as dotenv from 'dotenv';
import { DirectoryTree, generateProjectMetadata } from "./MetadataGenerator";

dotenv.config();


function generateOutput(specs: string, tree: DirectoryTree[]): string {
    return `${specs}\n${generateIndentedText(tree)})}`
}
function generateIndentedText(tree: DirectoryTree[], indentLevel: number = 0): string {
    const indent = '  '.repeat(indentLevel);
    //todo: fit ${item.description?` // ${item.description}`:""} in there properly for files
    return tree.map(item => {
        let output = `${indent}${item.name}${item.type === 'directory' ? '/' : ''}${item.type === 'file' && item.description ? ` // ${item.description}`: ""}\n`;

        if (item.type === 'file') {
            output += item.functions?.map(func =>
                `${indent}  ${func.isAsync ? 'async ' : ''}function ${func.name}(${func.parameters.map(param => `${param.name}: ${param.type}`).join(', ')}): ${func.returnType}${func.description?` // ${func.description}`:""}\n`
            ).join('') || '';

            output += item.interfaces?.map(interf =>
                `${indent}  interface ${interf.name} {${interf.properties.map(prop => `${prop.name}: ${prop.type}`).join(', ')}}\n`
            ).join('') || '';

            output += item.classes?.map(cls => {
                let classOutput = `${indent}  class ${cls.name}${cls.description?` // ${cls.description}`:""}\n`;

                if (cls.constructorParameters.length > 0) {
                    classOutput += `${indent}    constructor(${cls.constructorParameters.map(param => `${param.name}: ${param.type}`).join(', ')})\n`;
                }

                classOutput += cls.properties.map(prop =>
                    `${indent}    ${prop.name}: ${prop.type};\n`
                ).join('');

                classOutput += cls.methods.map(method =>
                    `${indent}    ${method.isAsync ? 'async ' : ''}${method.name}(${method.parameters.map(param => `${param.name}: ${param.type}`).join(', ')}): ${method.returnType}${method.description?` // ${method.description}`:""}\n`
                ).join('');

                return classOutput;
            }).join('') || '';
        }

        if (item.children) {
            output += generateIndentedText(item.children, indentLevel + 1);
        }

        return output;
    }).join('');
}



async function main(){
    
    // let data =await generateProjectMetadata("C:\\Users\\Jonathan\\Desktop\\project bozo\\utils\\bozo-gpt\\src", true)
    // let data =await generateProjectMetadata("./inputs", true)
    let data =await  generateProjectMetadata("./src", true)
    fs.writeFileSync("./outputs/output.json", JSON.stringify(data, null, 2));
    fs.writeFileSync("./outputs/output1.txt", generateOutput("Windows 10 typescript project to summarize code for an ai assistant", [data]));


}
main();
