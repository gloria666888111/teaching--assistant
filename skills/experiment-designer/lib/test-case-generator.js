/**
 * TestCaseGenerator - 测试用例生成器
 *
 * 设计测试用例，生成评分标准
 */

class TestCaseGenerator {
  constructor(difficultyClassifier) {
    this.difficultyClassifier = difficultyClassifier;
  }

  /**
   * 生成测试用例
   */
  generateTestCases(options = {}) {
    const {
      experimentType,
      experimentTitle,
      difficulty,
      knowledgePoints
    } = options;

    const testCases = [];

    // 生成基础测试用例
    testCases.push(...this.generateBasicTestCases(experimentType));

    // 根据难度添加额外测试用例
    if (difficulty === '进阶' || difficulty === '综合') {
      testCases.push(...this.generateAdvancedTestCases(experimentType));
    }

    if (difficulty === '综合') {
      testCases.push(...this.generateComprehensiveTestCases(experimentType));
    }

    return testCases;
  }

  /**
   * 生成基础测试用例
   */
  generateBasicTestCases(experimentType) {
    const basicCases = {
      programming: [
        {
          id: 'TC-001',
          name: '功能正确性测试',
          description: '测试核心功能是否正确实现',
          priority: '高',
          steps: [
            '准备测试数据',
            '调用核心功能',
            '验证输出结果',
            '记录测试结果'
          ],
          expected: '功能输出符合预期'
        },
        {
          id: 'TC-002',
          name: '简单输入测试',
          description: '使用简单输入验证程序',
          priority: '高',
          steps: [
            '输入简单数据',
            '运行程序',
            '检查输出',
            '验证结果'
          ],
          expected: '程序正常运行'
        }
      ],
      configuration: [
        {
          id: 'TC-001',
          name: '配置验证测试',
          description: '验证配置是否正确应用',
          priority: '高',
          steps: [
            '检查配置文件',
            '应用配置',
            '验证配置生效',
            '记录配置状态'
          ],
          expected: '配置正确应用'
        },
        {
          id: 'TC-002',
          name: '基本功能测试',
          description: '测试基本功能是否可用',
          priority: '高',
          steps: [
            '启动服务',
            '执行基本操作',
            '检查功能',
            '验证结果'
          ],
          expected: '基本功能正常'
        }
      ],
      analysis: [
        {
          id: 'TC-001',
          name: '数据分析测试',
          description: '测试数据分析功能',
          priority: '高',
          steps: [
            '准备分析数据',
            '执行分析',
            '检查分析结果',
            '验证准确性'
          ],
          expected: '分析结果准确'
        },
        {
          id: 'TC-002',
          name: '可视化测试',
          description: '测试数据可视化',
          priority: '中',
          steps: [
            '生成可视化图表',
            '检查图表',
            '验证数据展示',
            '确认可读性'
          ],
          expected: '图表清晰正确'
        }
      ],
      design: [
        {
          id: 'TC-001',
          name: '设计完整性测试',
          description: '检查设计文档完整性',
          priority: '高',
          steps: [
            '检查设计文档',
            '验证设计内容',
            '确认设计完整性',
            '记录缺失项'
          ],
          expected: '设计完整规范'
        },
        {
          id: 'TC-002',
          name: '设计合理性测试',
          description: '验证设计方案合理性',
          priority: '高',
          steps: [
            '审查设计方案',
            '检查可行性',
            '评估合理性',
            '提出建议'
          ],
          expected: '设计合理可行'
        }
      ],
      comprehensive: [
        {
          id: 'TC-001',
          name: '系统集成测试',
          description: '测试系统集成情况',
          priority: '高',
          steps: [
            '集成各模块',
            '执行功能测试',
            '检查集成效果',
            '验证系统功能'
          ],
          expected: '系统集成正常'
        },
        {
          id: 'TC-002',
          name: '端到端测试',
          description: '完整流程测试',
          priority: '高',
          steps: [
            '准备完整流程',
            '执行端到端测试',
            '检查各环节',
            '验证流程完整性'
          ],
          expected: '流程完整可用'
        }
      ]
    };

    return basicCases[experimentType] || basicCases.programming;
  }

  /**
   * 生成进阶测试用例
   */
  generateAdvancedTestCases(experimentType) {
    const advancedCases = {
      programming: [
        {
          id: 'TC-003',
          name: '边界条件测试',
          description: '测试边界和特殊情况',
          priority: '中',
          steps: [
            '设计边界数据',
            '执行测试',
            '检查处理结果',
            '验证正确性'
          ],
          expected: '正确处理边界情况'
        },
        {
          id: 'TC-004',
          name: '错误处理测试',
          description: '测试错误处理机制',
          priority: '中',
          steps: [
            '制造错误输入',
            '执行程序',
            '检查错误处理',
            '验证异常处理'
          ],
          expected: '有合理的错误处理'
        }
      ],
      configuration: [
        {
          id: 'TC-003',
          name: '高级配置测试',
          description: '测试高级配置选项',
          priority: '中',
          steps: [
            '配置高级选项',
            '应用配置',
            '验证配置效果',
            '记录结果'
          ],
          expected: '高级配置正常工作'
        },
        {
          id: 'TC-004',
          name: '配置冲突测试',
          description: '测试配置冲突处理',
          priority: '中',
          steps: [
            '制造配置冲突',
            '应用配置',
            '检查冲突处理',
            '验证结果'
          ],
          expected: '正确处理冲突'
        }
      ],
      analysis: [
        {
          id: 'TC-003',
          name: '复杂数据测试',
          description: '测试复杂数据处理',
          priority: '中',
          steps: [
            '准备复杂数据',
            '执行分析',
            '检查结果',
            '验证准确性'
          ],
          expected: '准确处理复杂数据'
        },
        {
          id: 'TC-004',
          name: '分析效率测试',
          description: '测试分析效率',
          priority: '中',
          steps: [
            '准备大数据',
            '执行分析',
            '记录时间',
            '评估效率'
          ],
          expected: '分析效率合理'
        }
      ],
      design: [
        {
          id: 'TC-003',
          name: '设计扩展性测试',
          description: '评估设计扩展性',
          priority: '中',
          steps: [
            '分析设计',
            '评估扩展能力',
            '提出改进建议',
            '记录评估结果'
          ],
          expected: '设计具有良好的扩展性'
        },
        {
          id: 'TC-004',
          name: '设计性能评估',
          description: '评估设计性能',
          priority: '中',
          steps: [
            '分析设计方案',
            '评估性能影响',
            '预测性能表现',
            '提出优化建议'
          ],
          expected: '设计性能合理'
        }
      ],
      comprehensive: [
        {
          id: 'TC-003',
          name: '性能测试',
          description: '测试系统性能',
          priority: '中',
          steps: [
            '设计性能测试',
            '执行测试',
            '记录性能数据',
            '评估性能'
          ],
          expected: '性能达到要求'
        },
        {
          id: 'TC-004',
          name: '稳定性测试',
          description: '测试系统稳定性',
          priority: '中',
          steps: [
            '长时间运行',
            '监控状态',
            '检查异常',
            '评估稳定性'
          ],
          expected: '系统稳定运行'
        }
      ]
    };

    return advancedCases[experimentType] || advancedCases.programming;
  }

  /**
   * 生成综合测试用例
   */
  generateComprehensiveTestCases(experimentType) {
    const comprehensiveCases = {
      programming: [
        {
          id: 'TC-005',
          name: '性能测试',
          description: '测试代码性能',
          priority: '中',
          steps: [
            '设计性能测试',
            '执行测试',
            '记录时间',
            '评估性能'
          ],
          expected: '性能达到要求'
        },
        {
          id: 'TC-006',
          name: '代码质量测试',
          description: '评估代码质量',
          priority: '低',
          steps: [
            '检查代码风格',
            '审查注释',
            '评估可读性',
            '检查规范性'
          ],
          expected: '代码质量良好'
        }
      ],
      configuration: [
        {
          id: 'TC-005',
          name: '配置优化测试',
          description: '测试配置优化效果',
          priority: '中',
          steps: [
            '优化配置',
            '应用配置',
            '测试效果',
            '评估优化'
          ],
          expected: '配置优化有效'
        },
        {
          id: 'TC-006',
          name: '故障恢复测试',
          description: '测试故障恢复能力',
          priority: '中',
          steps: [
            '制造故障',
            '测试恢复',
            '检查恢复结果',
            '评估恢复能力'
          ],
          expected: '能正常恢复'
        }
      ],
      analysis: [
        {
          id: 'TC-005',
          name: '深度分析测试',
          description: '测试深度分析能力',
          priority: '中',
          steps: [
            '设计深度分析',
            '执行分析',
            '检查结果',
            '验证深度'
          ],
          expected: '分析深度足够'
        },
        {
          id: 'TC-006',
          name: '分析可靠性测试',
          description: '测试分析结果可靠性',
          priority: '中',
          steps: [
            '重复分析',
            '比较结果',
            '评估一致性',
            '验证可靠性'
          ],
          expected: '结果可靠一致'
        }
      ],
      design: [
        {
          id: 'TC-005',
          name: '设计优化测试',
          description: '测试设计优化方案',
          priority: '中',
          steps: [
            '设计优化方案',
            '实施优化',
            '评估效果',
            '总结优化'
          ],
          expected: '优化有效'
        },
        {
          id: 'TC-006',
          name: '设计创新性评估',
          description: '评估设计创新性',
          priority: '低',
          steps: [
            '分析设计方案',
            '评估创新点',
            '比较方案',
            '记录评价'
          ],
          expected: '有创新点'
        }
      ],
      comprehensive: [
        {
          id: 'TC-005',
          name: '压力测试',
          description: '系统压力测试',
          priority: '中',
          steps: [
            '设计压力场景',
            '执行压力测试',
            '监控状态',
            '评估极限'
          ],
          expected: '系统承受能力达标'
        },
        {
          id: 'TC-006',
          name: '兼容性测试',
          description: '测试系统兼容性',
          priority: '中',
          steps: [
            '测试不同环境',
            '检查兼容性',
            '记录问题',
            '评估兼容性'
          ],
          expected: '兼容性良好'
        }
      ]
    };

    return comprehensiveCases[experimentType] || comprehensiveCases.programming;
  }

  /**
   * 生成评分标准
   */
  generateGradingCriteria(options = {}) {
    const { difficulty, experimentType } = options;

    // 获取难度评分标准
    const criteria = this.difficultyClassifier.getGradingCriteria(
      difficulty.toLowerCase()
    );

    // 构建详细评分标准
    const grading = {
      total: 100,
      breakdown: [
        {
          category: '功能实现',
          weight: criteria.functionImplementation,
          items: this.getFunctionItems(experimentType, difficulty)
        },
        {
          category: '代码质量',
          weight: criteria.codeQuality,
          items: this.getCodeQualityItems(difficulty)
        },
        {
          category: '实验报告',
          weight: criteria.report,
          items: this.getReportItems(difficulty)
        }
      ]
    };

    // 添加加分项
    if (criteria.bonus > 0) {
      grading.breakdown.push({
        category: '加分项',
        weight: criteria.bonus,
        items: [
          {
            item: '创新点',
            maxScore: 5,
            description: '有独特的创新想法或实现'
          },
          {
            item: '额外功能',
            maxScore: criteria.bonus - 5,
            description: '实现了超出要求的功能'
          }
        ]
      });
    }

    return grading;
  }

  /**
   * 获取功能评分项
   */
  getFunctionItems(experimentType, difficulty) {
    const items = [
      {
        item: '核心功能',
        maxScore: difficulty === '基础' ? 50 : 40,
        description: '实现实验要求的核心功能'
      }
    ];

    if (difficulty === '进阶' || difficulty === '综合') {
      items.push({
        item: '功能完整性',
        maxScore: 15,
        description: '功能完整，无缺失'
      });
    }

    if (difficulty === '综合') {
      items.push({
        item: '性能优化',
        maxScore: 10,
        description: '进行了合理的性能优化'
      });
    }

    return items;
  }

  /**
   * 获取代码质量评分项
   */
  getCodeQualityItems(difficulty) {
    const items = [
      {
        item: '代码规范',
        maxScore: 8,
        description: '代码风格符合规范'
      },
      {
        item: '注释完整',
        maxScore: 7,
        description: '注释清晰完整'
      }
    ];

    if (difficulty === '进阶' || difficulty === '综合') {
      items.push({
        item: '结构清晰',
        maxScore: 5,
        description: '代码结构清晰，易于维护'
      });
    }

    return items;
  }

  /**
   * 获取报告评分项
   */
  getReportItems(difficulty) {
    const items = [
      {
        item: '内容完整',
        maxScore: 8,
        description: '报告内容完整，涵盖所有要求'
      },
      {
        item: '逻辑清晰',
        maxScore: 7,
        description: '报告逻辑清晰，层次分明'
      }
    ];

    if (difficulty === '综合') {
      items.push({
        item: '分析深入',
        maxScore: 5,
        description: '有深入的分析和思考'
      });
    }

    return items;
  }

  /**
   * 生成测试计划
   */
  generateTestPlan(testCases, experimentType) {
    return {
      experimentType,
      totalTests: testCases.length,
      highPriorityTests: testCases.filter(tc => tc.priority === '高').length,
      mediumPriorityTests: testCases.filter(tc => tc.priority === '中').length,
      lowPriorityTests: testCases.filter(tc => tc.priority === '低').length,
      estimatedTime: this.estimateTestTime(experimentType, testCases.length),
      testCases
    };
  }

  /**
   * 估算测试时间
   */
  estimateTestTime(experimentType, testCount) {
    const timePerTest = {
      programming: 30, // 分钟
      configuration: 20,
      analysis: 40,
      design: 25,
      comprehensive: 60
    };

    return `${Math.ceil(testCount * timePerTest[experimentType] / 60)}小时`;
  }
}

module.exports = TestCaseGenerator;
