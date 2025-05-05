import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "settings.json");

// Function to read settings.json
const readSettings = () => {
  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    return { error: "Could not read settings file" };
  }
};

// Function to write to settings.json
const writeSettings = (data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return { success: true };
  } catch (error) {
    return { error: "Could not update settings file" };
  }
};

export default function handler(req, res) {
  if (req.method === "GET") {
    // Return current settings
    return res.status(200).json(readSettings());
  }

  if (req.method === "POST") {
    // Modify part of settings (e.g., add user, update secret)
    const { users, secret, lastRepo } = req.body;
    const currentSettings = readSettings();

    if (users) currentSettings.users = users;
    if (secret) currentSettings.secret = secret;
    if (lastRepo) currentSettings.lastRepo = lastRepo;

    const result = writeSettings(currentSettings);
    return res.status(result.success ? 200 : 500).json(result);
  }

  if (req.method === "PUT") {
    // Overwrite entire settings file
    const newSettings = req.body;
    const result = writeSettings(newSettings);
    return res.status(result.success ? 200 : 500).json(result);
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
