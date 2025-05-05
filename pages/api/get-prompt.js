import fs from "fs";
import path from "path";

// Set the path to your text file
const filePath = path.join(process.cwd(), "data", "prompt.txt");

export default function handler(req, res) {
  if (req.method === "GET") {
    try {
      // Read the contents of the text file
      const fileContents = fs.readFileSync(filePath, "utf8");
      res.status(200).send(fileContents);  // Return the contents
    } catch (error) {
      res.status(500).json({ error: "Error reading text file" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" }); // Only GET is allowed
  }
}
