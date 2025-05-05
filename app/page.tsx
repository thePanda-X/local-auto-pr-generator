"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, Copy, Github, Moon, Plus, RefreshCw, Settings, Sun, User, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism"


// Define types for our data structure
type Repository = {
  id: string
  name: string
}

type GithubUser = {
  id: string
  username: string
  repositories: Repository[]
}

export default function Home() {
  const [settings, setSettings] = useState(null);
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("diff")
  const [model, setModel] = useState("wizardlm2:7b")
  const [allModels, setAllModels] = useState<string[]>(["wizardlm2:7b", "deepseek-v2:latest"])
  const [users, setUsers] = useState<GithubUser[]>([
    {
      id: "user1",
      username: "DLT-Code",
      repositories: [
        { id: "repo1", name: "soc-ceres-back" },
      ],
    },
  ])
  const [selectedRepo, setSelectedRepo] = useState("")
  const [prNumber, setPrNumber] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [diffContent, setDiffContent] = useState("")
  const [selectedDiffFile, setSelectedDiffFile] = useState<string>("")
  const [diffFiles, setDiffFiles] = useState<Record<string, string>>({})
  const [markdownContent, setMarkdownContent] = useState("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [activeJson, setActiveJson] = useState("")
  const [activePrompt, setActivePrompt] = useState("")
  const [error, setError] = useState("")
  const extractedMarkdown = useRef<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [newRepoName, setNewRepoName] = useState("")
  const [selectedUser, setSelectedUser] = useState("")
  const [modalStep, setModalStep] = useState<"user" | "repo">("user")
  const [aproxTokens, setAproxTokens] = useState(0)

  // Handle theme mounting to prevent hydration mismatch
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setIsLoading(false);
        setGithubToken(data.secret);
        setUsers(data.users);
        setSelectedRepo(data.lastRepo || "")
      })
      .catch((err) => console.error("Error fetching settings:", err));

    fetch("/api/get-prompt")
      .then((res) => res.text())
      .then((data) => {
        setActivePrompt(data);
      })
      .catch((err) => console.error("Error fetching prompt:", err));


    fetch('http://localhost:11434/api/tags')
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
        setAllModels(data.models.map(tag => tag.name))
        setModel(data.models[0].name)
      })
      .catch((err) => console.error("Error fetching tags:", err));

    setMounted(true);
  }, []);

  const handleDumpJson = () => {
    const filename = "active_json.txt";
    const data = activeJson;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  async function getChangedFiles(owner: string, repo: string, prNumber: string, token: string) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!response.ok) {
      console.error("Error fetching PR files:", response.statusText);
      return "error";
    }

    const files = await response.json();

    // Create an object with filename as the key and patch (diff) as the value
    const changes = files.reduce((acc: any, file: any) => {
      acc[file.filename] = file.patch || "No diff available";
      return acc;
    }, {});
    return JSON.stringify(changes, null, 2);
  }

  const handleFetchDiffs = async () => {
    setIsLoading(true);

    try {
      const json = await getChangedFiles(
        selectedRepo.split("/")[0],
        selectedRepo.split("/")[1],
        prNumber,
        githubToken
      );
      const parsedJson = JSON.parse(json);
      setActiveJson(JSON.stringify(parsedJson));

      setAproxTokens(
        JSON.stringify(parsedJson).split(" ").length +
        activePrompt.split(" ").length
      );

      setDiffFiles(parsedJson);

      // Set the first file as selected by default
      const firstFile = Object.keys(parsedJson)[0];
      setSelectedDiffFile(firstFile);
      setDiffContent(parsedJson[firstFile]);

      // Update lastRepo in settings
      await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lastRepo: selectedRepo }),
      });

    } catch (error) {
      console.error("Error fetching diffs:", error);
      setError(`Error fetching diffs: ${error}`);
    } finally {
      setIsLoading(false);
      setActiveTab("diff");
    }
  };

  const handleSelectDiffFile = (filename: string) => {
    setSelectedDiffFile(filename)
    setDiffContent(diffFiles[filename])
  }


  function parseDashes(text: string) {
    if (!text.includes('---')) return text; // Return original text if no dashes exist

    const firstIndex = text.indexOf('---');
    const lastIndex = text.lastIndexOf('---');

    // Replace the first occurrence
    let modifiedText = text.substring(0, firstIndex) + "```markdown" + text.substring(firstIndex + 3);

    // Adjust lastIndex since text length has changed
    const adjustedLastIndex = modifiedText.lastIndexOf('---');
    if (adjustedLastIndex !== -1) {
      modifiedText = modifiedText.substring(0, adjustedLastIndex) + "```" + modifiedText.substring(adjustedLastIndex + 3);
    }

    return modifiedText;
  }

  function extractPr(text: string) {
    // Regular expression to match the outermost code block
    const regex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/;

    // Match the first occurrence of a code block
    const match = text.match(regex);

    if (match) {
      // Return the code block content (without the triple backticks and language identifier)
      return match[2].trim();
    } else {
      return null;  // No code block found
    }
  }

  const handleGeneratePR = async () => {
    setIsLoading(true)
    setIsGenerating(true)
    setMarkdownContent("") // Clear existing content
    setActiveTab("preview") // Immediately switch to preview tab

    try {
      const body = {
        model: model,
        options: {
          num_ctx: 8096,
        },
        prompt: `<json_file>${activeJson}</json_file>\n\n${activePrompt}. markdown response: `
      };
      setAproxTokens(body.prompt.split(" ").length)
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),  // Fresh request with no accumulated context
      });

      if (!response.ok || !response.body) {
        setError(`Ollama request failed: ${response.statusText}`);
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      // Stream response handling
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedResponse = '';

      // Read the response stream in chunks
      while (!done) {
        const { value, done: chunkDone } = await reader.read();
        done = chunkDone;

        // Decode the chunk into a string and accumulate
        const chunk = decoder.decode(value, { stream: true });

        // Try to parse each chunk as JSON
        try {
          const data = JSON.parse(chunk);

          // If 'done' is true, stop the process
          if (data.done) {
            done = true;
          }

          // If the 'response' exists, accumulate it
          if (data.response) {
            accumulatedResponse += data.response;
          }
          setMarkdownContent(accumulatedResponse)

        } catch (e) {
          // If parsing fails, log and continue to next chunk
          console.error("Error parsing chunk as JSON:", e);
        }
      }

      // Post-process the response:
      // 1. Replace escaped newlines with actual newlines
      let processedResponse = accumulatedResponse.replace(/\\n/g, '\n');

      // 2. Remove double new lines and replace with a single new line
      processedResponse = processedResponse.replace(/\n\s*\n/g, '\n\n');

      // 3. mark all checklist items as done
      processedResponse = processedResponse.replaceAll('- [ ]', '- [x]');

      // 4. parse the dashes if they exist
      processedResponse = parseDashes(processedResponse);

      // 5. Optionally, trim any leading/trailing white space
      processedResponse = processedResponse.toString().trim();

      // check if the response starts with ## ❗Descripción❗
      if (processedResponse.startsWith("## ❗Descripción❗")) {
        // wrap the response in markdown code block
        processedResponse = `\`\`\`markdown\n${processedResponse}\`\`\``;
      }

      // 6. extract the code block from the response
      const codeBlock = extractPr(processedResponse);
      if (codeBlock) {
        extractedMarkdown.current = codeBlock;
      }

      // set the clean markdown content as the final result.
      setMarkdownContent(processedResponse)
      console.log(processedResponse)

    } catch (e) {
      console.error("Error generating PR summary:", error);
      if (e instanceof Error) {
        setError(`${e}`);
      }
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
    }
  }

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleAddUser = async () => {
    if (!newUsername.trim()) return;

    const newUser: GithubUser = {
      id: `user${Date.now()}`,
      username: newUsername,
      repositories: [],
    };

    const updatedUsers = [...users, newUser];

    setUsers(updatedUsers);
    setSelectedUser(newUser.id);
    setNewUsername("");
    setModalStep("repo");
  };


  const handleAddRepository = async () => {
    if (!newRepoName.trim() || !selectedUser) return

    const updatedUsers = users.map((user) => {
      if (user.id === selectedUser) {
        return {
          ...user,
          repositories: [
            ...user.repositories,
            {
              id: `repo${Date.now()}`,
              name: newRepoName,
            },
          ],
        }
      }
      return user
    })

    setUsers(updatedUsers)
    setNewRepoName("")

    // Find the full repo path for the newly added repo
    const user = updatedUsers.find((u) => u.id === selectedUser)
    if (user) {
      const newRepo = user.repositories[user.repositories.length - 1]
      setSelectedRepo(`${user.username}/${newRepo.name}`)
    }

    console.log("Updated users:", updatedUsers);

    // Update users in settings
    await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ users: updatedUsers }),
    });

    // Close the modal
    setIsModalOpen(false)
    // Reset modal state for next time
    setModalStep("user")
  }

  const resetModal = () => {
    setNewUsername("")
    setNewRepoName("")
    setSelectedUser("")
    setModalStep("user")
  }

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      resetModal()
    }
  }

  // Get all repositories formatted for the select component
  const getAllRepositories = () => {
    const repos: { value: string; label: string }[] = []
    users.forEach((user) => {
      user.repositories.forEach((repo) => {
        repos.push({
          value: `${user.username}/${repo.name}`,
          label: `${user.username}/${repo.name}`,
        })
      })
    })
    return repos
  }

  // Toggle theme handler
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // If not mounted yet, don't render to prevent hydration mismatch
  if (!mounted) return null

  // Determine current theme for UI rendering
  const currentTheme = theme || "dark"

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-md bg-white/80 dark:bg-black/30 sticky top-0 z-10">
        <div className="container mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Github className="h-6 w-6 text-zinc-900 dark:text-white" />
            <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-500 bg-clip-text text-transparent">
              PR Diff Generator
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDumpJson}
              className="border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Dump JSON
            </Button>
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <Switch id="dark-mode" checked={currentTheme === "dark"} onCheckedChange={toggleTheme} />
              <Moon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Panel - Controls */}
        <Card className="md:col-span-1 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-medium">GitHub Configuration</h2>
              <div className="space-y-2">
                <Label htmlFor="github-token">GitHub Token</Label>
                <Input
                  id="github-token"
                  type="password"
                  placeholder="Enter your GitHub token"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-medium">Repository</h2>
              <div className="flex space-x-2">
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 flex-1 text-zinc-900 dark:text-white">
                    <SelectValue placeholder="Select repository" className="text-zinc-500 dark:text-zinc-300" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white">
                    {users.map((user) => (
                      <SelectGroup key={user.id}>
                        <SelectLabel className="text-zinc-500 dark:text-zinc-400">{user.username}</SelectLabel>
                        {user.repositories.map((repo) => (
                          <SelectItem
                            key={repo.id}
                            value={`${user.username}/${repo.name}`}
                            className="text-zinc-900 dark:text-white focus:text-zinc-900 dark:focus:text-white focus:bg-zinc-100 dark:focus:bg-zinc-700"
                          >
                            {repo.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <motion.div whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}>
                        <Plus className="h-4 w-4" />
                      </motion.div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white">
                    <DialogHeader>
                      <DialogTitle>{modalStep === "user" ? "Add GitHub User" : "Add Repository"}</DialogTitle>
                      <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                        {modalStep === "user"
                          ? "Add a GitHub user to fetch repositories from."
                          : "Add a repository for the selected user."}
                      </DialogDescription>
                    </DialogHeader>

                    {modalStep === "user" ? (
                      <>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="username">GitHub Username</Label>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                              <Input
                                id="username"
                                placeholder="e.g., octocat"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 flex-1"
                              />
                            </div>
                          </div>

                          {users.length > 0 && (
                            <div className="space-y-2">
                              <Label>Or select existing user</Label>
                              <Select value={selectedUser} onValueChange={setSelectedUser}>
                                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white">
                                  <SelectValue placeholder="Select user" className="text-zinc-500 dark:text-zinc-300" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white">
                                  {users.map((user) => (
                                    <SelectItem
                                      key={user.id}
                                      value={user.id}
                                      className="text-zinc-900 dark:text-white focus:text-zinc-900 dark:focus:text-white focus:bg-zinc-100 dark:focus:bg-zinc-700"
                                    >
                                      {user.username}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            className="border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={selectedUser ? () => setModalStep("repo") : handleAddUser}
                            disabled={!newUsername && !selectedUser}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {selectedUser ? "Continue" : "Add User"}
                          </Button>
                        </DialogFooter>
                      </>
                    ) : (
                      <>
                        <div className="space-y-4 py-4">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {users.find((u) => u.id === selectedUser)?.username}
                            </span>
                          </div>

                          <Separator className="bg-zinc-200 dark:bg-zinc-800" />

                          <div className="space-y-2">
                            <Label htmlFor="repo-name">Repository Name</Label>
                            <div className="flex items-center space-x-2">
                              <Github className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                              <Input
                                id="repo-name"
                                placeholder="e.g., awesome-project"
                                value={newRepoName}
                                onChange={(e) => setNewRepoName(e.target.value)}
                                className="bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 flex-1"
                              />
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setModalStep("user")}
                            className="border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            Back
                          </Button>
                          <Button
                            onClick={handleAddRepository}
                            disabled={!newRepoName}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Add Repository
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-medium">Pull Request</h2>
              <div className="space-y-2">
                <Label htmlFor="pr-number">PR Number</Label>
                <Input
                  id="pr-number"
                  type="number"
                  placeholder="Enter PR number"
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  className="bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-medium">Model</h2>
              <div className="space-y-2">
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 flex-1 text-zinc-900 dark:text-white">
                    <SelectValue placeholder="Select repository" className="text-zinc-500 dark:text-zinc-300" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white">
                    {allModels.map((modelOption) => (
                      <SelectItem key={modelOption} value={modelOption}>
                        {modelOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-medium">Actions</h2>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={handleFetchDiffs}
                  disabled={isLoading || !selectedRepo || !prNumber}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading && activeTab === "diff" ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Fetch Diffs
                </Button>
                <Button
                  onClick={handleGeneratePR}
                  disabled={isLoading || !diffContent}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  {isLoading && activeTab === "preview" ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="mr-2 h-4 w-4" />
                  )}
                  Generate PR Description
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-4 text-xs text-zinc-500 dark:text-zinc-500"
            >
              <p>Using Ollama for PR generation</p>
              <p className="mt-1">All data is processed locally</p>
              {activePrompt && <p className="mt-1">Approximate tokens: {aproxTokens}</p>}
            </motion.div>
          </CardContent>
        </Card>

        {/* Right Panel - Preview */}
        <Card className="md:col-span-2 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-3">
              <TabsList className="bg-zinc-100/50 dark:bg-zinc-800/50 p-0.5">
                <TabsTrigger
                  value="diff"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white px-4 py-2 rounded-md"
                >
                  Diff Preview
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white px-4 py-2 rounded-md"
                >
                  PR Generation
                </TabsTrigger>
                <TabsTrigger
                  value="copied-content"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white px-4 py-2 rounded-md"
                >
                  Extracted Preview
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="p-6 h-[calc(100vh-12rem)] overflow-auto">
              <AnimatePresence mode="wait">
                <TabsContent value="diff" className="mt-0">
                  {Object.keys(diffFiles).length > 0 ? (
                    <motion.div
                      key="diff-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* File selector tabs */}
                      <div className="flex overflow-x-auto pb-2">
                        <div className="flex space-x-1">
                          {Object.keys(diffFiles).map((filename) => (
                            <button
                              key={filename}
                              onClick={() => handleSelectDiffFile(filename)}
                              className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${selectedDiffFile === filename
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                }`}
                            >
                              {filename.split("/").pop()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* File path display */}
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 pb-2 flex items-center">
                        <Github className="h-3.5 w-3.5 mr-1.5" />
                        <span className="font-mono">{selectedDiffFile}</span>
                      </div>

                      {/* Diff content */}
                      <SyntaxHighlighter
                        language="diff"
                        style={currentTheme === "dark" ? atomDark : vs}
                        className="rounded-lg text-sm"
                        showLineNumbers
                      >
                        {diffContent}
                      </SyntaxHighlighter>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="diff-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-full text-center space-y-4 text-zinc-500 dark:text-zinc-500"
                    >
                      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center">
                        <Github className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">No Diff Available</h3>
                        <p className="max-w-md mt-2">
                          Select a repository and PR number, then click "Fetch Diffs" to view the changes.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>
                <TabsContent value="preview" className="mt-0">
                  {markdownContent || isGenerating || error ? (
                    <motion.div
                      key="markdown-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose dark:prose-invert max-w-none"
                    >
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "")
                            const codeString = String(children).replace(/\n$/, "")

                            if (!inline && match) {
                              const language = match[1]
                              const codeIndex = markdownContent.indexOf(codeString)

                              return (
                                <div className="relative">
                                  <div className="absolute right-2 top-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopyCode(codeString, codeIndex)}
                                      className="h-8 w-8 bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 rounded-md"
                                    >
                                      {copiedIndex === codeIndex ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  <SyntaxHighlighter
                                    language={language}
                                    style={currentTheme === "dark" ? atomDark : vs}
                                    className="rounded-lg text-sm !mt-0"
                                    showLineNumbers
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              )
                            }

                            return inline ? (
                              // Inline code, keeping it on the same line
                              <span id="inlineCode" className="display-inline padding-5 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </span>
                            ) : (
                              <SyntaxHighlighter
                                style={currentTheme === "dark" ? atomDark : vs}
                                className="padding-5 rounded-lg text-sm display-inline"
                                {...props}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                            )
                          },
                          h1: ({ node, ...props }) => (
                            <h1
                              className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />,
                          p: ({ node, ...props }) => <p className="my-3 leading-7" {...props} />,
                          ul: ({ node, ...props }) => <ul className="my-3 ml-6 list-disc" {...props} />,
                          li: ({ node, ...props }) => <li className="my-1" {...props} />,
                        }}
                      >
                        {markdownContent}
                      </ReactMarkdown>


                      {error && <div className="w-full bg-red-500 text-white p-4 rounded-lg flex items-center justify-between shadow-md animate-fadeIn">
                        <p className="font-medium">{error}</p>
                        <XCircle
                          className="w-6 h-6 cursor-pointer hover:text-gray-200 transition"
                          onClick={() => setError("")}
                        />
                      </div>
                      }

                      {isGenerating && (
                        <div className="mt-2 flex items-center text-zinc-500 dark:text-zinc-400 animate-pulse">
                          <span className="mr-2">Generating</span>
                          <span className="inline-block w-1 h-4 bg-zinc-400 dark:bg-zinc-600 rounded-full mr-1"></span>
                          <span className="inline-block w-1 h-4 bg-zinc-400 dark:bg-zinc-600 rounded-full mr-1 animation-delay-200"></span>
                          <span className="inline-block w-1 h-4 bg-zinc-400 dark:bg-zinc-600 rounded-full animation-delay-400"></span>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="markdown-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-full text-center space-y-4 text-zinc-500 dark:text-zinc-500"
                    >
                      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center">
                        <Settings className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">No PR Description Yet</h3>
                        <p className="max-w-md mt-2">
                          Fetch the diffs first, then click "Generate PR Description" to create markdown content.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>
                <TabsContent value="copied-content" className="mt-0">
                  {extractedMarkdown.current ? (
                    <motion.div
                      key="markdown-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="prose dark:prose-invert max-w-none"
                    >
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "")
                            const codeString = String(children).replace(/\n$/, "")

                            if (!inline && match) {
                              const language = match[1]
                              const codeIndex = markdownContent.indexOf(codeString)

                              return (
                                <div className="relative">
                                  <div className="absolute right-2 top-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => { }}
                                      className="h-8 w-8 bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 rounded-md"
                                    >
                                      {copiedIndex === codeIndex ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                  <SyntaxHighlighter
                                    language={language}
                                    style={currentTheme === "dark" ? atomDark : vs}
                                    className="rounded-lg text-sm !mt-0"
                                    showLineNumbers
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              )
                            }

                            return inline ? (
                              // Inline code, keeping it on the same line
                              <span id="inlineCode" className="display-inline bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </span>
                            ) : (
                              <SyntaxHighlighter
                                style={currentTheme === "dark" ? atomDark : vs}
                                className="rounded-lg text-sm display-inline"
                                {...props}
                              >
                                {codeString}
                              </SyntaxHighlighter>
                            )
                          },
                          h1: ({ node, ...props }) => (
                            <h1
                              className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />,
                          p: ({ node, ...props }) => <p className="my-3 leading-7" {...props} />,
                          ul: ({ node, ...props }) => <ul className="my-3 ml-6 list-disc" {...props} />,
                          li: ({ node, ...props }) => <li className="my-1" {...props} />,
                        }}
                      >
                        {extractedMarkdown.current.replaceAll('[x]', '☑️')}
                      </ReactMarkdown>


                      {error && <div
                        style={{
                          width: '100%',
                          padding: '15px',
                          backgroundColor: '#f8d7da',
                          color: '#721c24',
                          border: '1px solid #f5c6cb',
                          borderRadius: '5px',
                          textAlign: 'center',
                          fontSize: '16px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <p>{error}</p>
                      </div>
                      }
                    </motion.div>
                  ) : (
                    <motion.div
                      key="markdown-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-full text-center space-y-4 text-zinc-500 dark:text-zinc-500"
                    >
                      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center">
                        <Copy className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">No PR generated yet</h3>
                        <p className="max-w-md mt-2">
                          Once generated, any extracted markdown from the response will be show formated here.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>
              </AnimatePresence>
            </div>
          </Tabs>
        </Card>
      </main>
    </div>
  )
}

