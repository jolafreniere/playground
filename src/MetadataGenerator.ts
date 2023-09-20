import * as fs from "fs";
import { readdirSync } from "fs";
import { basename, join } from "path";
import { Project } from "ts-morph";
import { createCompletion } from "./openai/openAIService";
const project = new Project();

export interface DirectoryTree {
    name: string;
    type: "directory" | "file";
    path?: string;
    description?: string;
    children?: DirectoryTree[];
    functions?: FunctionSignature[];
    interfaces?: InterfaceSignature[];
    classes?: ClassSignature[];
}

export interface Signature {
    name: string;
}

export interface InterfaceSignature extends Signature {
    properties: Array<{ name: string; type: string }>;
}

export interface FunctionSignature extends Signature {
    parameters: Array<{ name: string; type: string }>;
    returnType: string;
    isAsync: boolean;
    description?: string;
 }

 export interface ParameterSignature extends Signature {
    type: string;
}

export interface MethodSignature extends FunctionSignature {
}

export interface PropertySignature extends ParameterSignature {
}

export interface ClassSignature extends Signature {
    methods: MethodSignature[];
    properties: PropertySignature[];
    description?: string;
    constructorParameters: ParameterSignature[];
}

export interface SignatureDetails {
    functions: FunctionSignature[];
    interfaces: InterfaceSignature[];
    classes: ClassSignature[];
}





export async function generateProjectMetadata(rootPath: string, enhance : boolean = false): Promise<DirectoryTree> {
    return await readDirectory(rootPath, enhance);
}

  async function readDirectory(dirPath: string, enhance: boolean = false): Promise<DirectoryTree> {
    const name = basename(dirPath);
    const item: DirectoryTree = { name, type: "directory", children: [] };
  
    const entries = readdirSync(dirPath, { withFileTypes: true });
  
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }
  
      const fullPath = join(dirPath, entry.name);
  
      if (entry.isDirectory()) {
        item.children?.push(await readDirectory(fullPath, enhance));
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        let fileSummary : string= "";
        if(enhance){
            fileSummary = await describeGPTFile(fullPath);
        }
          const { functions, interfaces, classes } = await getSignatures(fullPath, enhance);
          if (functions.length > 0 || interfaces.length > 0 || classes.length > 0) {
              item.children?.push({
                  name: entry.name,
                  type: "file",
                  path: fullPath,
                  description: fileSummary.replace(/\n/g, ""),
                  functions,
                  interfaces,
                  classes
              });
          }
      }
    }
  
    return item;
  }
  async function describeGPTFunctions(filePath : string) : Promise<Object>{
    const content = fs.readFileSync(filePath, 'utf-8');
    let completion = await createCompletion(wrapCode(content), "given a typescript file, give a brief summary of what each function does, in one, two, maximum three sentences. be as detailed and concise as possible. Your output should be a json object matching function name to description. ALWAYS ESCAPE PROPERLY FOR THE JSON FORMAT", 1000);

    let descriptions = JSON.parse(completion.content || "{}");
    console.log("PARSED DESCRIPTIONS: ");
    console.log(descriptions);
    return descriptions;

  }

  async function describeGPTFile(filePath : string) : Promise<string>{
    const content = fs.readFileSync(filePath, 'utf-8');
    let completion = await createCompletion(wrapCode(content), "given a typescript file, give a detailed, but concise summary of what the file does, keep it to the most relevant details. assume that the function per function description is done elsewhere", 300);
    return completion.content || "";
  }

  function wrapCode(code: string){
    return "```ts\n" + code + "\n\`\`\`\n";
  }
  async function getSignatures(filePath: string, describeGPT: boolean = false): Promise<SignatureDetails> {
    const sourceFile = project.addSourceFileAtPath(filePath);
    let descriptions : any;
    if(describeGPT){
        descriptions = await describeGPTFunctions(filePath);
    }
    const getArgumentsDetails = (desc: any) => ({
        name: desc.getName().replace(/import\("[^"]+"\)\./, ""),
        type: desc.getType().getText().replace(/import\("[^"]+"\)\./, ""),
    });

    const getFunctionsDetails = (func: any) => ({
        name: func.getName()?.toString().replace(/import\("[^"]+"\)\./, "") || "unspecified",
        parameters: func.getParameters().map(getArgumentsDetails),
        description: descriptions ? descriptions[func.getName()]:"",
        isAsync: func.isAsync(),
        returnType: func.getReturnType().getText().replace(/import\("[^"]+"\)\./, ""),
    });

    const getInterfaceDetails = (interf: any) => ({
        name: interf.getName(),
        properties: interf.getProperties().map(getArgumentsDetails),
    });

    const getClassDetails = (cls: any) => ({
        name: cls.getName() || "",
        methods: cls.getMethods().map(getFunctionsDetails),
        description: descriptions ? descriptions[cls.getName()]:"",
        properties: cls.getProperties().map(getArgumentsDetails),
        constructorParameters: cls.getConstructors()[0]?.getParameters().map(getArgumentsDetails) || [],
    });

    const functions = sourceFile.getFunctions().map(getFunctionsDetails);
    const interfaces = sourceFile.getInterfaces().map(getInterfaceDetails);
    const classes = sourceFile.getClasses().map(getClassDetails);

    return { functions, interfaces, classes };
}
