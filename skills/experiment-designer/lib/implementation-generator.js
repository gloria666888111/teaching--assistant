/**
 * ImplementationGenerator - 代码实现生成器
 *
 * 根据实验需求生成示例代码
 */

class ImplementationGenerator {
  constructor() {
    // 编程语言模板
    this.codeTemplates = {
      python: {
        class: `class {ClassName}:
    """{Description}"""

    def __init__(self):
        """初始化"""
        pass

    def {methodName}(self, {params}):
        """
        {MethodDescription}

        Args:
            {ParamsDescription}

        Returns:
            {ReturnDescription}
        """
        pass
`,
        function: `def {functionName}({params}):
    """
    {FunctionDescription}

    Args:
        {ParamsDescription}

    Returns:
        {ReturnDescription}
    """
    # 实现代码
    pass

# 测试代码
if __name__ == "__main__":
    # 测试示例
    pass
`,
        main: `def main():
    """主函数"""
    # 在这里编写主逻辑
    pass

if __name__ == "__main__":
    main()
`
      },
      c: {
        header: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/**
 * @brief {Description}
 */
{Type} {FunctionName}({Params}) {{
    /* 实现代码 */
    return 0;
}}

int main() {{
    /* 主函数 */
    return 0;
}}
`,
        struct: `/**
 * @brief {StructDescription}
 */
typedef struct {StructName} {{
    {Fields}
}} {StructName};

/**
 * @brief 初始化结构体
 */
{StructName}* {StructName}_init() {{
    {StructName}* obj = ({StructName}*)malloc(sizeof({StructName}));
    if (obj != NULL) {{
        /* 初始化 */
    }}
    return obj;
}}

/**
 * @brief 释放结构体
 */
void {StructName}_destroy({StructName}* obj) {{
    if (obj != NULL) {{
        free(obj);
    }}
}}
`
      },
      cpp: {
        class: `/**
 * @brief {ClassDescription}
 */
class {ClassName} {{
public:
    {ClassName}();
    ~{ClassName}();

    {ReturnType} {MethodName}({Params}) {{
        // 实现代码
        return {DefaultValue};
    }}

private:
    {Members}
}};

{ClassName}::{ClassName}() {{
    // 构造函数
}}

{ClassName}::~{ClassName}() {{
    // 析构函数
}}
`,
        function: `/**
 * @brief {FunctionDescription}
 *
 * @param {ParamNames} {ParamDescriptions}
 * @return {ReturnType}
 */
{ReturnType} {FunctionName}({Params}) {{
    // 实现代码
    return {DefaultValue};
}}

int main() {{
    // 主函数
    return 0;
}}
`
      },
      java: {
        class: `/**
 * {ClassDescription}
 */
public class {ClassName} {{

    /**
     * 构造函数
     */
    public {ClassName}() {{
        // 初始化
    }}

    /**
     * {MethodDescription}
     *
     * @param {ParamNames} {ParamDescriptions}
     * @return {ReturnType}
     */
    public {ReturnType} {MethodName}({Params}) {{
        // 实现代码
        return {DefaultValue};
    }}

    public static void main(String[] args) {{
        // 主函数
    }}
}}
`
      }
    };

    // 实验类型代码模板
    this.experimentCodeTemplates = {
      '栈': {
        python: `class Stack:
    """栈的实现"""

    def __init__(self):
        """初始化栈"""
        self.items = []

    def push(self, item):
        """入栈"""
        self.items.append(item)

    def pop(self):
        """出栈"""
        if not self.is_empty():
            return self.items.pop()
        return None

    def peek(self):
        """查看栈顶元素"""
        if not self.is_empty():
            return self.items[-1]
        return None

    def is_empty(self):
        """判断栈是否为空"""
        return len(self.items) == 0

    def size(self):
        """获取栈的大小"""
        return len(self.items)


# 测试代码
if __name__ == "__main__":
    stack = Stack()
    stack.push(1)
    stack.push(2)
    stack.push(3)

    print(f"栈顶元素: {stack.peek()}")
    print(f"栈大小: {stack.size()}")

    while not stack.is_empty():
        print(f"出栈: {stack.pop()}")
`
      },
      '队列': {
        python: `class Queue:
    """队列的实现"""

    def __init__(self):
        """初始化队列"""
        self.items = []

    def enqueue(self, item):
        """入队"""
        self.items.append(item)

    def dequeue(self):
        """出队"""
        if not self.is_empty():
            return self.items.pop(0)
        return None

    def front(self):
        """查看队首元素"""
        if not self.is_empty():
            return self.items[0]
        return None

    def is_empty(self):
        """判断队列是否为空"""
        return len(self.items) == 0

    def size(self):
        """获取队列的大小"""
        return len(self.items)


# 测试代码
if __name__ == "__main__":
    queue = Queue()
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)

    print(f"队首元素: {queue.front()}")
    print(f"队列大小: {queue.size()}")

    while not queue.is_empty():
        print(f"出队: {queue.dequeue()}")
`
      },
      '链表': {
        python: `class Node:
    """链表节点"""
    def __init__(self, data):
        self.data = data
        self.next = None


class LinkedList:
    """链表的实现"""

    def __init__(self):
        """初始化链表"""
        self.head = None

    def append(self, data):
        """在链表末尾添加节点"""
        new_node = Node(data)

        if self.head is None:
            self.head = new_node
            return

        current = self.head
        while current.next:
            current = current.next

        current.next = new_node

    def display(self):
        """显示链表内容"""
        current = self.head
        elements = []

        while current:
            elements.append(str(current.data))
            current = current.next

        print(" -> ".join(elements) if elements else "链表为空")

    def reverse(self):
        """反转链表"""
        prev = None
        current = self.head

        while current:
            next_node = current.next
            current.next = prev
            prev = current
            current = next_node

        self.head = prev


# 测试代码
if __name__ == "__main__":
    linked_list = LinkedList()

    linked_list.append(1)
    linked_list.append(2)
    linked_list.append(3)

    print("原始链表:")
    linked_list.display()

    linked_list.reverse()
    print("反转后:")
    linked_list.display()
`
      },
      '排序': {
        python: `def bubble_sort(arr):
    """
    冒泡排序算法

    Args:
        arr: 待排序的列表

    Returns:
        排序后的列表
    """
    n = len(arr)

    for i in range(n):
        # 每次将最大的元素冒泡到末尾
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]

    return arr


def quick_sort(arr):
    """
    快速排序算法

    Args:
        arr: 待排序的列表

    Returns:
        排序后的列表
    """
    if len(arr) <= 1:
        return arr

    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]

    return quick_sort(left) + middle + quick_sort(right)


def merge_sort(arr):
    """
    归并排序算法

    Args:
        arr: 待排序的列表

    Returns:
        排序后的列表
    """
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    return merge(left, right)


def merge(left, right):
    """归并两个已排序的列表"""
    result = []
    i = j = 0

    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1

    result.extend(left[i:])
    result.extend(right[j:])

    return result


# 测试代码
if __name__ == "__main__":
    test_arr = [64, 34, 25, 12, 22, 11, 90]

    print(f"原始数组: {test_arr}")

    print(f"冒泡排序: {bubble_sort(test_arr.copy())}")
    print(f"快速排序: {quick_sort(test_arr.copy())}")
    print(f"归并排序: {merge_sort(test_arr.copy())}")
`
      }
    };
  }

  /**
   * 生成实现代码
   */
  generateImplementation(options = {}) {
    const {
      experimentTitle,
      experimentType,
      knowledgePoints,
      difficulty,
      language = 'python'
    } = options;

    // 确定文件名
    const fileName = this.generateFileName(experimentTitle, language);

    // 生成代码
    let code = '';

    // 检查是否有预定义模板
    const templateCode = this.findTemplate(experimentTitle, knowledgePoints, language);
    if (templateCode) {
      code = templateCode;
    } else {
      // 使用通用模板
      code = this.generateGenericCode(experimentType, language, experimentTitle);
    }

    return {
      fileName,
      code,
      language,
      description: this.generateCodeDescription(experimentTitle, difficulty)
    };
  }

  /**
   * 查找预定义模板
   */
  findTemplate(experimentTitle, knowledgePoints, language) {
    // 合并实验标题和知识点
    const searchText = (experimentTitle + ' ' + knowledgePoints.map(k => k.title).join(' ')).toLowerCase();

    // 检查是否有匹配的模板
    for (const [key, templates] of Object.entries(this.experimentCodeTemplates)) {
      if (searchText.includes(key.toLowerCase())) {
        return templates[language];
      }
    }

    return null;
  }

  /**
   * 生成通用代码
   */
  generateGenericCode(experimentType, language, title) {
    const templates = this.codeTemplates[language];

    if (!templates) {
      return `// ${title}\n// 请根据实验要求实现代码\n`;
    }

    // 根据实验类型选择模板
    if (experimentType === 'programming') {
      // 编程实验使用完整模板
      const className = this.toPascalCase(title);
      const methodName = 'execute';

      return templates.class
        .replace(/{ClassName}/g, className)
        .replace(/{Description}/g, title)
        .replace(/{MethodName}/g, methodName)
        .replace(/{params}/g, 'data')
        .replace(/{MethodDescription}/g, '执行实验逻辑')
        .replace(/{ParamsDescription}/g, '输入数据')
        .replace(/{ReturnDescription}/g, '处理结果');
    } else {
      // 其他类型使用函数模板
      const functionName = this.toSnakeCase(title);

      return templates.function
        .replace(/{functionName}/g, functionName)
        .replace(/{FunctionDescription}/g, title)
        .replace(/{params}/g, '*args, **kwargs')
        .replace(/{ParamsDescription}/g, '实验参数')
        .replace(/{ReturnDescription}/g, '实验结果');
    }
  }

  /**
   * 生成代码描述
   */
  generateCodeDescription(experimentTitle, difficulty) {
    return `
此代码为${experimentTitle}的示例实现。

**功能说明：**
- 实现了实验要求的核心功能
- 包含必要的注释说明
- 提供了测试用例

**使用方法：**
1. 复制代码到开发环境
2. 根据实验要求修改和补充
3. 运行测试代码验证功能
4. 根据评分标准完善代码

**注意事项：**
- 代码仅供参考，需要根据具体要求修改
- 确保代码风格规范
- 添加必要的错误处理
- 完善测试用例
`;
  }

  /**
   * 生成文件名
   */
  generateFileName(experimentTitle, language) {
    // 移除特殊字符
    const cleanTitle = experimentTitle
      .replace(/[^\w\u4e00-\u9fa5]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // 语言扩展名
    const extensions = {
      python: 'py',
      c: 'c',
      cpp: 'cpp',
      java: 'java'
    };

    return `${cleanTitle}.${extensions[language] || 'txt'}`;
  }

  /**
   * 转换为 PascalCase
   */
  toPascalCase(str) {
    return str
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * 转换为 snake_case
   */
  toSnakeCase(str) {
    return str
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  /**
   * 保存代码文件
   */
  async saveCodeFile(code, filePath) {
    const fs = require('fs');
    const path = require('path');

    try {
      console.log(`[ImplementationGenerator] 保存文件: ${filePath}`);
      console.log(`[ImplementationGenerator] 文件内容长度: ${code.length}`);

      // 确保目录存在
      const dir = path.dirname(filePath);
      console.log(`[ImplementationGenerator] 创建目录: ${dir}`);
      await fs.promises.mkdir(dir, { recursive: true });

      // 写入文件
      await fs.promises.writeFile(filePath, code, 'utf-8');
      console.log(`[ImplementationGenerator] 文件保存成功`);

      // 验证文件是否存在
      const exists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      console.log(`[ImplementationGenerator] 文件存在验证: ${exists}`);

      return { success: true, filePath };
    } catch (error) {
      console.error(`[ImplementationGenerator] 保存文件失败:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成测试用例
   */
  generateTestCases(experimentTitle, difficulty) {
    const testCases = [];

    // 基础测试用例
    testCases.push({
      name: '基础功能测试',
      description: '测试基本功能是否正常工作',
      expected: '功能正常',
      steps: ['准备测试数据', '执行功能', '验证结果']
    });

    // 进阶测试用例
    if (difficulty === '进阶' || difficulty === '综合') {
      testCases.push({
        name: '边界情况测试',
        description: '测试边界条件和异常情况',
        expected: '正确处理',
        steps: ['准备边界数据', '执行功能', '验证处理']
      });
    }

    // 综合测试用例
    if (difficulty === '综合') {
      testCases.push({
        name: '性能测试',
        description: '测试性能指标是否达标',
        expected: '性能达标',
        steps: ['准备大数据', '执行测试', '记录结果']
      });
    }

    return testCases;
  }
}

module.exports = ImplementationGenerator;
