# Consciousness Lab - GitHub Action

> 🤖 Multi-perspective AI analysis for your codebase, in one line.

Add AI agents that analyze your code from 4 recursive levels: Structure → Learning → Possibilities → Philosophy

## Usage

Add this to `.github/workflows/analyze.yml`:

```yaml
name: AI Code Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}  # Required for branch creation & issues
      
      - name: Analyze with Consciousness Lab
        uses: idea-nexus-ventures/analyze-action@v1
        with:
          openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
```

That's it! 🎉

## What You Get

Every time you push code:

1. **🏗️ Architect** analyzes structure (components, dependencies, patterns)
2. **📚 Educator** updates learning resources (concepts, examples, tutorials)
3. **🔮 Visionary** explores possibilities (future features, compositions)
4. **🤔 Philosopher** synthesizes meta-insights (assumptions, principles)

Results appear as:
- ✅ Agent branches (`agent/architect`, `agent/educator`, etc.)
- ✅ Summary issue with all insights
- ✅ Updated documentation

## Setup

### 1. Get OpenRouter API Key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Create API key
3. Add to GitHub secrets: Settings → Secrets → Actions → New secret
   - Name: `OPENROUTER_API_KEY`
   - Value: your key

### 2. Set Up Permissions

**For full functionality** (branches + issues), add `GITHUB_TOKEN` to your workflow:

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}  # Required for branch creation & issues
```

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions - no setup needed!

**For analysis only** (no branches/issues), you can skip the token:
```yaml
- uses: idea-nexus-ventures/analyze-action@v1
  with:
    openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
    create_branches: 'false'
    create_summary: 'false'
```

### 3. Add Workflow File

Create `.github/workflows/analyze.yml` with the usage example above.

### 4. Push to Trigger

```bash
git add .github/workflows/analyze.yml
git commit -m "Add AI analysis"
git push
```

Watch the Actions tab for results!

## Configuration Options

### Run Specific Agents

```yaml
- uses: idea-nexus-ventures/analyze-action@v1
  with:
    openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
    agents: 'architect,visionary'  # Only run these two
```

### Use Cheaper Model

```yaml
- uses: idea-nexus-ventures/analyze-action@v1
  with:
    openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
    model: 'anthropic/claude-3-haiku'  # ~80% cost savings
```

### Disable Branch Creation

```yaml
- uses: idea-nexus-ventures/analyze-action@v1
  with:
    openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
    create_branches: 'false'  # Just get insights, no branches
    create_summary: 'true'    # Still create summary issue
```

### Analyze Subdirectory

```yaml
- uses: idea-nexus-ventures/analyze-action@v1
  with:
    openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
    working_directory: './packages/frontend'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `openrouter_key` | OpenRouter API key | ✅ Yes | - |
| `agents` | Agents to run (comma-separated or 'all') | No | `all` |
| `model` | LLM model to use | No | `anthropic/claude-3.5-sonnet` |
| `create_branches` | Create agent branches | No | `true` |
| `create_summary` | Create summary issue | No | `true` |
| `working_directory` | Directory to analyze | No | `.` |

## Outputs

Use outputs in subsequent steps:

```yaml
- name: Analyze
  id: analyze
  uses: idea-nexus-ventures/analyze-action@v1
  with:
    openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}

- name: Use Insights
  run: |
    echo "Architect: ${{ steps.analyze.outputs.architect_insights }}"
    echo "Summary: ${{ steps.analyze.outputs.summary_url }}"
```

Available outputs:
- `architect_insights` - Structural insights
- `educator_insights` - Learning insights
- `visionary_insights` - Possibility insights
- `philosopher_insights` - Meta-cognitive insights
- `summary_url` - URL to summary issue

## Examples

### Python Project

```yaml
name: Analyze Python Code
on: push
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: idea-nexus-ventures/analyze-action@v1
        with:
          openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
```

### Go Project

```yaml
name: Analyze Go Code
on: pull_request
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: idea-nexus-ventures/analyze-action@v1
        with:
          openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
```

### Rust Project

```yaml
name: Analyze Rust Code
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: idea-nexus-ventures/analyze-action@v1
        with:
          openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
```

**Works for ANY programming language!** 🌍

## Cost

- **OpenRouter API**: ~$0.14 per analysis (Claude 3.5 Sonnet)
- **GitHub Actions**: Free (public repos)
- **Total**: ~$0.14 per push

💡 Use `claude-3-haiku` for ~$0.02 per analysis

## Why This is Better Than NPM

| Feature | NPM Package | This Action |
|---------|-------------|-------------|
| **Setup Time** | 15-30 minutes | 2-5 minutes |
| **Language Support** | Node.js only | All languages |
| **Installation** | npm install | One workflow file |
| **Updates** | Manual | Automatic |
| **CI/CD** | Extra setup | Native |

## Roadmap

- [ ] Support for custom character definitions
- [ ] Integration with GitHub Copilot
- [ ] VSCode extension
- [ ] Dashboard UI for insights
- [ ] Self-hosted option

## License

MIT

## Changelog

### v1.2.8 (Latest)
- 🐛 **Fixed**: Deep dive analysis LLM termination issues
- 🐛 **Fixed**: Analysis failing on directories with spaces/special characters
- 🐛 **Fixed**: LLM token limit issues causing API termination
- ✨ **Improved**: Better error handling and directory skipping for problematic paths

### v1.2.7
- 🐛 **Fixed**: Agent state file creation timing issue
- 🐛 **Fixed**: ENOENT errors when coaching system can't find agent state files
- 🐛 **Fixed**: Coaching system running before agent state files are created
- ✨ **Improved**: Agent state files are now created during analysis step

### v1.2.6
- 🐛 **Fixed**: "agent is not defined" error in coaching system
- 🐛 **Fixed**: Agent state file path resolution issues
- 🐛 **Fixed**: Action crashes when coaching session fails
- ✨ **Improved**: Error handling and recovery mechanisms

### v1.0.0
- 🚀 **Initial release**: Multi-perspective AI analysis
- ✨ **Features**: 4 AI agents, branch creation, summary issues
- ✨ **Support**: All programming languages

## Troubleshooting

### Permission Errors

If you see errors like:
- `Permission denied to github-actions[bot]`
- `Resource not accessible by integration`

**Solution**: Add `GITHUB_TOKEN` to your checkout step:
```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Analysis Only Mode

If you don't need branches or issues, disable them:
```yaml
- uses: idea-nexus-ventures/analyze-action@v1
  with:
    openrouter_key: ${{ secrets.OPENROUTER_API_KEY }}
    create_branches: 'false'
    create_summary: 'false'
```

### Common Issues

- **"Cannot find module"**: Make sure you're using the latest version (`@v1`)
- **"OpenRouter API error"**: Check your API key is valid and has credits
- **"No insights generated"**: Try with a more complex codebase

## Support

- **Issues**: [GitHub Issues](https://github.com/idea-nexus-ventures/analyze-action/issues)
- **Discussions**: [GitHub Discussions](https://github.com/idea-nexus-ventures/analyze-action/discussions)
- **Email**: leo@ideanexusventures.com

---

Made with 🤖 by the Idea Nexus Ventures Consciousness Lab team

