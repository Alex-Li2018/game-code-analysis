import os
import json
from typing import Dict, Any, List

BASE_GAME_JSON_DIR = 'game-json'

class Server:
    def __init__(self):
        self.dependencies_json = {}
        # 对应的JSON Schema
        self.tool_schema = [{
            "type": "function",
            "function": {
                "name": "load_file",
                "description": "加载源代码文件并解析其结构",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "相对于代码库根目录的文件路径"
                        },
                        "focus_lines": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "需要特别关注的行号列表"
                        }
                    },
                    "required": ["file_path"]
                }
            }
        }, {
            "type": "function",
            "function": {
                "name": "write_markdown_file",
                "description": "将游戏的全部分析结果以markdown的格式保存md文件里",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "markdown_content": {
                            "type": "string",
                            "description": "游戏项目的分析结果"
                        },
                        "file_name": {
                            "type": "string",
                            "description": "输出md文件的文字"
                        }
                    },
                    "required": ["file_path"]
                }
            }
        }]
        # 启动时获取依赖
        self.load_dependencies()

    def load_dependencies(self):
        try:
            project_root = os.path.dirname(os.path.dirname(__file__))
            file_path = os.path.join(project_root, BASE_GAME_JSON_DIR, 'all.json')
            with open(file_path, 'r') as file:
                self.dependencies_json = json.load(file)
        except json.JSONDecodeError as e:
            print(f"JSON 解析失败: {e}")
        except FileNotFoundError:
            print("文件不存在")

    # 示例：文件加载函数
    """
        加载指定文件内容并提取关键部分
    """
    def load_file(self, file_path: str, focus_lines: List[int] = None) -> Dict:

        full_path = os.path.join(file_path)

        if not os.path.exists(full_path):
            return {"error": f"File not found: {file_path}", "code": 404}

        with open(full_path, 'r') as f:
            content = f.read()

        # 写入已有的AST分析数据
        ast_json = {}
        for item in self.dependencies_json:
            if item["path"].lower() == file_path.lower():
                ast_json = item

        # 提取关注行
        if focus_lines:
            lines = content.split('\n')
            focused = [lines[i-1] for i in focus_lines if 0 < i <= len(lines)]

        return {
            "action": "request_files",
            "targets": [
                {
                    "fileName": ast_json['fileName'],
                    "path": file_path,
                    "externalImports": ast_json['externalImports'],
                    "internalImports": ast_json['internalImports'],
                    "functions": ast_json['functions']
                }
            ],
            "content": content
        }
    
    def write_markdown_file(self, markdown_content, file_name = 'output.md'):
        '''
            将markdown字符串写入文件
        '''
        try:
            with open(file_name, 'w', encoding='utf-8') as md_file:
                md_file.write(markdown_content)
        except Exception as e:
            print(f'''发生写入md错误: {str(e)}''')

if __name__ == '__main__':
    fc = Server()
    path = os.path.join(os.getcwd(), 'game/assets/typescript/game.ts')
    fc.load_file(path)