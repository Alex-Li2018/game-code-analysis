import json
from openai import OpenAI
from functioncall import Server

class Client:
    def __init__(self):
        self.client = OpenAI(
            # 此处的key需要先通过平台创建
            api_key="sk-a85596241ce64b99b2dd",  
            #模型地址(不包含chat/completions部分)
            base_url="http://ai-gateway.maipuat.msxf.test/witwx4/voyt1l/maip/deepseek-r1-32b-bf16-32k"  
        )
        self.server = Server()
        self.system_prompt = f'''
            **代码逻辑分析 - Cocos项目**

            **交互规则**：
            1. 您将分阶段接收代码信息，每个阶段都可请求查看新文件
            2. 当需要更多代码时，请按格式发起文件请求
            3. 我会根据请求提供指定文件内容

            **当前已知**：
            每个文件都有一个依赖文件，其具体格式如下：
            ```json
            {{
                "fileName": "game.ts",
                "path": "/users/yapeng.li/desktop/ts-ast/game/assets/typescript/game.ts",
                "externalImports": [
                    "cc"
                ],
                "internalImports": [
                    "/Users/yapeng.li/Desktop/ts-ast/resource/dyGift/DyGiftTS",
                    "/Users/yapeng.li/Desktop/ts-ast/ast/block"
                ],
                "functions": []
            }}
            ```

            **分析任务**：
            1. 推断游戏启动流程
            2. 识别生命周期方法（onLoad/start/update）里的逻辑
            3. 分析游戏的具体玩法以及实现逻辑
            4. 追踪资源加载逻辑

            **请求格式**：
            ```json
            {{
                "action": "request_files",
                "targets": [
                    {{
                        "fileName": "game.ts",
                        "path": "/users/yapeng.li/desktop/ts-ast/game/assets/typescript/game.ts",
                        "externalImports": [
                            "cc"
                        ],
                        "internalImports": [
                            "/Users/yapeng.li/Desktop/ts-ast/resource/dyGift/DyGiftTS",
                            "/Users/yapeng.li/Desktop/ts-ast/ast/block"
                        ],
                        "functions": []
                    }}
                ],
                "content": "文件完整内容"
            }}
            ```

            **响应示例**：
            ```json
            {{
                "analysis_summary": ["上述分析的内容"],
                "required_files": [
                    {{
                        "file": "src/SceneController.ts",
                        "focus": ["SceneController.loadScene()", "@property"],
                        "reason": "确认场景切换是否触发资源预加载"
                    }}
                ]
            }}
        '''
        self.send_message = []
        self.send_message.append({
            "role": "system",
            "content": self.system_prompt
        })

    def handler_send_message(self, messages):
        self.send_message.append({
            "role": "user",
            "content": json.dumps(messages)
        })
        chat_completion = self.client.chat.completions.create(
            messages=self.send_message,
            # 此处可更换其它模型
            model="deepseek-r1-32b-bf16-32k",  
            stream=False,
            # 工具
            tools=self.server.tool_schema,
            # 输出token控制
            max_tokens=512
        )
        self.handler_response(chat_completion)

    def handler_response(self, response):
        print(response)

if __name__ == '__main__':
    client = Client()
    request_message = client.server.load_file('/users/yapeng.li/desktop/ts-ast/game/assets/typescript/game.ts')
    client.handler_send_message(request_message)