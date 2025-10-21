#!/usr/bin/env node
/**
 * Agent Management CLI
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { GitHubIntegration } from '../src/github-integration.js';
import { AgentState } from '../src/agent-state.js';
import { runAgentUpdate } from '../src/agent-update-workflow.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

const program = new Command();
const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf-8'));

program
  .name('clab-agents')
  .description('Manage evolved agent system')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize agent branches')
  .action(async () => {
    console.log(chalk.bold.magenta('\n🤖 Initializing Agent System\n'));
    const spinner = ora('Creating agent branches...').start();
    try {
      const github = new GitHubIntegration();
      await github.initializeAgentBranches();
      spinner.succeed('Agent branches initialized');
      console.log(chalk.green('\n✅ Agent system ready!'));
      console.log(chalk.gray('\nAgent branches created:'));
      console.log(chalk.gray('  - agent/architect (Structure & Architecture)'));
      console.log(chalk.gray('  - agent/educator (Learning & Tutorials)'));
      console.log(chalk.gray('  - agent/visionary (Vision & Possibilities)'));
      console.log(chalk.gray('  - agent/philosopher (Philosophy & Principles)\n'));
    } catch (error) {
      spinner.fail('Failed');
      console.error(chalk.red('\n❌ Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Manually trigger agent updates')
  .action(async () => {
    console.log(chalk.bold.magenta('\n🔄 Updating Agents\n'));
    const spinner = ora('Analyzing repository...').start();
    try {
      const github = new GitHubIntegration();
      const repoContext = await github.getRepoContext();
      spinner.text = 'Running agent analysis...';
      await runAgentUpdate(repoContext);
      spinner.succeed('Agents updated');
      console.log(chalk.green('\n✅ All agent branches updated\n'));
    } catch (error) {
      spinner.fail('Update failed');
      console.error(chalk.red('\n❌ Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show status of all agents')
  .action(async () => {
    console.log(chalk.bold.magenta('\n🤖 Agent Status\n'));
    const agents = ['architect', 'educator', 'visionary', 'philosopher'];
    for (const agentId of agents) {
      const agentState = new AgentState(agentId);
      const loaded = await agentState.load();
      if (loaded) {
        const state = agentState.state;
        console.log(chalk.cyan(`\n${state.agent.name}:`));
        console.log(`  Level: ${state.agent.level} - ${state.agent.levelName}`);
        console.log(`  Evolved: ${state.agent.evolved ? chalk.green('Yes') : chalk.gray('No')}`);
        console.log(`  Insights: ${state.understanding.insights.length}`);
        console.log(`  Transformations: ${state.evolution.transformations.length}`);
        console.log(`  Last update: ${new Date(state.metadata.lastModified).toLocaleString()}`);
      } else {
        console.log(chalk.gray(`\n${agentId}: Not initialized`));
      }
    }
    console.log();
  });

program.parse();
