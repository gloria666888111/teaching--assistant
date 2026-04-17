#!/usr/bin/env node

/**
 * 智能教学助手 - CLI 工具
 *
 * 使用方式:
 *   node cli.js "为《Python程序设计》生成试卷"
 *   node cli.js
 */

const readline = require('readline');
const { TeachingAssistant } = require('./teaching-assistant');

class TeachingAssistantCLI {
  constructor() {
    this.assistant = new TeachingAssistant();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * 运行交互式CLI
   */
  async run() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   智能教学助手 - Teaching Assistant v1.0       ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n基于实际教学资料，为您提供智能辅助。\n');
    console.log('💡 输入 "帮助" 查看可用功能，输入 "退出" 结束\n');

    while (true) {
      const input = await this.prompt('\n🤖 请输入您的需求: ');

      if (!input.trim()) {
        continue;
      }

      if (/exit|quit|退出|bye/.test(input.toLowerCase())) {
        console.log('\n👋 感谢使用智能教学助手！再见！\n');
        break;
      }

      try {
        console.log('');
        const result = await this.assistant.process(input);
        console.log('\n' + result);
      } catch (error) {
        console.error(`\n❌ ${error.message}\n`);
      }
    }

    this.rl.close();
  }

  /**
   * 提示用户输入
   * @param {string} question
   * @returns {Promise<string>}
   */
  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// 主程序
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // 命令行模式：直接执行
    const userInput = args.join(' ');
    const assistant = new TeachingAssistant();

    assistant.process(userInput)
      .then(result => {
        console.log(result);
        process.exit(0);
      })
      .catch(error => {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      });
  } else {
    // 交互式模式
    const cli = new TeachingAssistantCLI();
    cli.run().catch(error => {
      console.error(`\n❌ 错误: ${error.message}`);
      process.exit(1);
    });
  }
}

module.exports = { TeachingAssistantCLI };
