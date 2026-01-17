# 编程任务

请使用工具完成以下任务：

1. 首先使用 readFile 工具读取 adder.md 文件，了解需求
2. 然后使用 writeFile 工具创建 adder_cloc.cpp 文件，写入实现代码

**工具调用示例**：
```
>>>CALL:readFile
{"filePath":"adder.md"}
<<<

>>>CALL:writeFile
{"filePath":"adder_cloc.cpp","content":"#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}"}
<<<
```

**重要**：
- 必须使用 readFile 工具读取 adder.md
- 必须使用 writeFile 工具创建 adder_cloc.cpp 文件
- 不能只输出代码，必须实际使用 writeFile 工具创建文件
- 必须使用 >>>CALL:toolName\n{"param":"value"}\n<<< 格式调用工具
