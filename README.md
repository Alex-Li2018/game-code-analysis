# Game Code Analysis Tool

A powerful tool for analyzing game code using LLM (Language Learning Model) capabilities. This tool helps developers understand, analyze, and document game codebases through AI-powered code analysis.

## Features

- AI-powered code analysis using DeepSeek LLM
- Interactive code exploration
- Automatic dependency analysis
- Markdown documentation generation
- Context-aware code understanding
- File loading and analysis capabilities

## Prerequisites

- Python 3.x
- OpenAI API key
- DeepSeek API access

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd game-code-analysis
```

2. Install the required dependencies:
```bash
pip install openai functioncall colorama
```

3. Configure your API keys:
   - Open `llm/main.py`
   - Add your DeepSeek API key in the `api_key` field

## Project Structure

```
game-code-analysis/
├── llm/
│   ├── main.py          # Main LLM client implementation
│   └── prompt.md        # System prompts and instructions
├── game/
│   └── assets/
│       └── typescript/  # Game code files
└── README.md
```

## Usage

1. Start the analysis:
```bash
python llm/main.py
```

2. The tool will:
   - Load and analyze game code files
   - Process dependencies
   - Generate documentation
   - Provide interactive code exploration

## Features in Detail

### Code Analysis
- Automatic loading and parsing of game code files
- Dependency analysis and visualization
- Context-aware code understanding

### Documentation
- Automatic markdown documentation generation
- Code structure visualization
- Dependency mapping

### Interactive Features
- User-guided code exploration
- Context-aware responses
- Dynamic file loading and analysis

## Configuration

The tool can be configured through the following files:
- `llm/main.py`: Main configuration and API settings
- `llm/prompt.md`: System prompts and analysis instructions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Your chosen license]

## Support

For support, please [create an issue](your-issue-tracker-url) in the repository. 