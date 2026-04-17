#!/usr/bin/env node

/**
 * 输入参数验证脚本
 * 用于验证 Course Content Generator 的输入参数
 */

const fs = require('fs');
const path = require('path');

/**
 * 验证输入参数
 * @param {object} params - 输入参数
 * @returns {object} 验证结果
 */
function validateInput(params) {
  const errors = [];
  const warnings = [];

  // 验证必需参数
  if (!params.courseName) {
    errors.push('courseName is required');
  }

  if (!params.chapters || params.chapters.length === 0) {
    errors.push('chapters array is required and should not be empty');
  }

  // 验证课程资料是否存在
  if (params.courseName) {
    const coursePath = path.join(__dirname, '../../teaching-data/textbooks', params.courseName);
    if (!fs.existsSync(coursePath)) {
      errors.push(`Course "${params.courseName}" does not exist in teaching-data/textbooks`);
    }
  }

  // 验证内容类型
  const validTypes = ['courseware', 'outline', 'knowledge', 'highlights', 'cases'];
  if (params.contentType && !validTypes.includes(params.contentType)) {
    warnings.push(`contentType "${params.contentType}" is not a standard type. Valid types: ${validTypes.join(', ')}`);
  }

  // 章节数量警告
  if (params.chapters && params.chapters.length > 3) {
    warnings.push(`Processing ${params.chapters.length} chapters at once may be slow. Consider processing in batches.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node validate-input.js <courseName> <chapter1,chapter2,...> [contentType]');
    process.exit(1);
  }

  const params = {
    courseName: args[0],
    chapters: args[1].split(',').map(c => c.trim()),
    contentType: args[2] || 'courseware'
  };

  const result = validateInput(params);

  console.log('Validation Result:');
  console.log(`Valid: ${result.valid}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(err => console.log(`  ❌ ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
  }

  process.exit(result.valid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateInput };