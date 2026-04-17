#!/usr/bin/env node

/**
 * 环境配置加载器
 * 自动加载 config.env 文件中的环境变量
 */

const fs = require('fs');
const path = require('path');

/**
 * 加载 .env 文件
 * @param {string} envPath - .env文件路径
 */
function loadEnv(envPath = path.join(__dirname, '..', 'config.env')) {
  try {
    if (!fs.existsSync(envPath)) {
      console.warn('⚠️  config.env 文件不存在，请创建并配置API密钥');
      return;
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach(line => {
      // 跳过注释和空行
      if (line.trim() === '' || line.trim().startsWith('#')) {
        return;
      }

      // 解析 KEY=VALUE 格式
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // 只设置未设置的环境变量
        if (!process.env[key]) {
          process.env[key] = value;
          console.log(`✅ 已加载环境变量: ${key}`);
        }
      }
    });

    // 若未直接配置 DEEPSEEK_API_KEY，可从“系统文件”路径读取（DEEPSEEK_API_KEY_FILE）
    if (!process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY_FILE) {
      const keyPath = process.env.DEEPSEEK_API_KEY_FILE.replace(/^~/, require('os').homedir());
      try {
        if (fs.existsSync(keyPath)) {
          const key = fs.readFileSync(keyPath, 'utf-8').split('\n')[0].trim();
          if (key) {
            process.env.DEEPSEEK_API_KEY = key;
            console.log('✅ 已从系统文件加载 DEEPSEEK_API_KEY');
          }
        }
      } catch (e) {
        console.warn('⚠️  读取 DEEPSEEK_API_KEY_FILE 失败:', e.message);
      }
    }

    console.log('\n✅ 环境配置加载完成\n');
  } catch (error) {
    console.error('❌ 加载环境配置失败:', error.message);
  }
}

/**
 * 检查必需的环境变量
 * @param {string[]} keys - 必需的环境变量列表
 */
function checkRequiredEnv(keys = ['VOLCENGINE_API_KEY']) {
  const missing = keys.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  缺少必需的环境变量: ${missing.join(', ')}`);
    console.log('请在 config.env 文件中配置这些变量');
    return false;
  }

  return true;
}

/**
 * 检查可选的环境变量
 * @param {string[]} keys - 可选的环境变量列表
 */
function checkOptionalEnv(keys = ['BAIDU_API_KEY', 'OPENAI_API_KEY']) {
  const missing = keys.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.log(`ℹ️  未配置可选的环境变量: ${missing.join(', ')}`);
    console.log('相关功能将不可用（如PPT生成）');
  } else {
    console.log('✅ 所有可选环境变量已配置');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('=== OpenClaw 智能教学助手 - 环境配置 ===\n');

  loadEnv();

  console.log('--- 环境变量检查 ---\n');

  const hasLLM = !!(process.env.DEEPSEEK_API_KEY || process.env.VOLCENGINE_API_KEY);
  checkOptionalEnv(['BAIDU_API_KEY', 'OPENAI_API_KEY', 'ZHIPU_API_KEY', 'DIFY_BASE_URL', 'DIFY_API_KEY', 'DIFY_DATASET_ID']);

  if (hasLLM) {
    console.log('\n✅ 配置检查通过，可以正常使用（LLM: ' + (process.env.DEEPSEEK_API_KEY ? 'DeepSeek' : '火山方舟') + '）');
  } else {
    console.log('\n❌ 请至少配置 DEEPSEEK_API_KEY 或 VOLCENGINE_API_KEY 之一');
    process.exit(1);
  }
}

module.exports = {
  loadEnv,
  checkRequiredEnv,
  checkOptionalEnv
};
