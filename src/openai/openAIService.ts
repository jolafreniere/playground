import * as fs from "fs";
import OpenAI from "openai";
//models are gpt-3.5-turbo, gpt-3.5-turbo-16k, gpt-4, gpt-4-32k
import * as dotenv from 'dotenv';
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

export async function createCompletion(message: string, system :string = "You are a helpful assistant", max_tokens: number = 1000, model : string = "gpt-3.5-turbo") {

      const opt : OpenAI.Chat.ChatCompletionCreateParams = {
        model: "gpt-3.5-turbo",
        max_tokens: max_tokens,
      
        n: 1,
        temperature: 0.8,
        stream: false,
        messages: [
            {
              role: "system",

              content: system ,
            },
            {
              role: "user",
              content: message,
            },
          ]
      };
    const response = await openai.chat.completions.create(opt);
    return response.choices[0].message;
}

export async function createEmbedding(filePath: string) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const chunks = splitIntoChunks(fileContent, 15200); // Adjust character limit according to your need

  const embeddings: any[] = [];

  for (const chunk of chunks) {
    const apiResponse = await openai.embeddings.create({
      input: chunk,
      model: 'text-embedding-ada-002',
    });
    console.log(apiResponse.data);
    const embedding = apiResponse.data; // Extract embedding from the response
    embeddings.push(embedding[0].embedding);
  }
  //write to filepath.embedding.json
  fs.writeFileSync(filePath + ".embedding.json", JSON.stringify(embeddings));
  // Now `embeddings` contains all the embeddings for each chunk
  // You can process this array further or store it somewhere
}

  function splitIntoChunks(text: string, approxCharPerChunk: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    let end = approxCharPerChunk;
  
    while (start < text.length) {
      if (end >= text.length) {
        end = text.length;
      } else {
        // Try to split by the nearest whitespace to avoid cutting words
        while (end < text.length && text[end] !== ' ') {
          end++;
        }
      }
  
      const chunk = text.slice(start, end);
      chunks.push(chunk);

      // Update start and end for the next iteration
      start = end;
      end = start + approxCharPerChunk;

    }

  
    return chunks;
  }