# Local Auto PR Generator

A local tool to automate the generation of pull requests based on local changes.

## Features

- Automatically generates pull request from a template templates using a PRs ID.
- Integrates with GitHub API for PR creation.

## Requirements

- **[Ollama](https://ollama.com/)**: This tool uses large language models locally via the Ollama framework.  
  Make sure you have Ollama installed and running before using this application.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/thePanda-X/local-auto-pr-generator.git
   cd local-auto-pr-generator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Usage

Run the tool using the provided PowerShell script:

```bash
./autorun.ps1
```

Alternatively, start the application manually:

```bash
npm run dev
ollama serve
```

## Configuration

- Your configurations will be saved in `data/settings.json`.
- Modify `data/prompts.txt` to include your PR template used for the response.
- If you are not concerned by you data being used by corporations, feel free to use the JSON dump button to create a txt file will the dump of your diffs, you can then use this with State of the art models for better responses with bigger context windows.

## License

This project is licensed under the MIT License.
