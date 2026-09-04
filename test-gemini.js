import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log("No API key found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Testing gemini-1.5-flash...");
    const result = await model.generateContent("Hello");
    console.log("Response:", result.response.text());
  } catch (e) {
    console.error("Error with gemini-1.5-flash:", e.message);
  }

  try {
    const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Testing gemini-pro...");
    const result2 = await model2.generateContent("Hello");
    console.log("Response:", result2.response.text());
  } catch (e) {
    console.error("Error with gemini-pro:", e.message);
  }
}

checkModels();
