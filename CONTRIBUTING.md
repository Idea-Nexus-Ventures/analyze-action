# Contributing to Consciousness Lab GitHub Action

Thank you for your interest in contributing! This action provides multi-perspective AI analysis for codebases.

## Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/idea-nexus-ventures/analyze-action.git
cd analyze-action
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment**
```bash
export OPENROUTER_API_KEY="your-key-here"
```

## Project Structure

```
analyze-action/
├── action.yml              # GitHub Action definition
├── bin/                    # Executable scripts
│   ├── agents.js          # Agent management CLI
│   └── run-agent.js       # Single agent runner
├── src/                    # Core modules
│   ├── agent-state.js     # State management
│   ├── model-adapter.js   # LLM interface
│   ├── character-system.js # Character loader
│   ├── github-integration.js # Git operations
│   └── agent-update-workflow.js # Orchestration
├── characters/             # Agent definitions
│   └── project-analysis.json
└── README.md
```

## Testing Locally

### Test the CLI
```bash
# Initialize agent branches
node bin/agents.js init

# Run manual update
node bin/agents.js update

# Check status
node bin/agents.js status
```

### Test Individual Agent
```bash
node bin/run-agent.js --agent=architect --model=anthropic/claude-3-haiku --output=json
```

### Test as GitHub Action
Create a test workflow in your repo:

```yaml
name: Test Action
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./  # Test local action
        with:
          openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
```

## Making Changes

### Adding New Agents
1. Add character definition to `characters/project-analysis.json`
2. Update agent lists in `action.yml` and `bin/agents.js`
3. Test thoroughly

### Modifying Analysis Logic
- Core logic is in `src/agent-update-workflow.js`
- Prompt engineering happens in `analyzeWithAgent()` function
- State management in `src/agent-state.js`

### Changing Output Format
- Modify JSON schema in `characters/project-analysis.json`
- Update state structure in `src/agent-state.js`
- Adjust summary generation in `action.yml` (Create Summary Issue step)

## Code Style

- Use ES modules (`import`/`export`)
- Include JSDoc comments for public functions
- Handle errors gracefully with try/catch
- Log progress for user feedback

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Local CLI commands work
- [ ] Individual agents run successfully
- [ ] Action works in test workflow
- [ ] Error handling works (test with invalid API key)
- [ ] Documentation is updated
- [ ] No hardcoded credentials

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request with description of changes

## Questions?

- Open an issue for bugs
- Use discussions for questions
- Email leo@ideanexusventures.com for sensitive topics

## License

By contributing, you agree your contributions will be licensed under the MIT License.

