import os
import json
from openai import OpenAI
from functioncall import Server
from colorama import Fore, Back, Style, init 

class Client:
    def __init__(self):
        self.client = OpenAI(
            # 此处的key需要先通过平台创建
            api_key="",  
            #模型地址(不包含chat/completions部分)
            base_url="https://api.deepseek.com"
        )
        self.server = Server()
        # 新增交互状态标志
        self.waiting_user_input = False  
        self.send_message = []
        self.load_dependencies()

    def load_dependencies(self):
        try:
            project_root = os.path.dirname(os.path.dirname(__file__))
            file_path = os.path.join(project_root, 'llm/prompt.md')
            with open(file_path, 'r') as file:
                system_prompt = file.read()
                dependencies_desc = f'''
                    **当前项目依赖分析结果（预分析结果）**
                    {self.server.dependencies_json}
                '''
                # 角色描述 / 添加前置依赖
                self.send_message.append({
                    "role": "system",
                    "content": system_prompt + dependencies_desc
                })
        except json.JSONDecodeError as e:
            print(Fore.RED + f"md 解析失败: {e}")
        except FileNotFoundError:
            print(Fore.RED + "文件不存在")
        

    def handler_send_message(self):
        '''发送请求'''
        response = self.client.chat.completions.create(
            messages=self.send_message,
            # 此处可更换其它模型
            model="deepseek-chat",
            # 温度
            temperature=0.0,
            stream=False,
            max_tokens=8192,
            # 工具
            tools=self.server.tool_schema,
        )
        self.handler_response(response.choices[0].message)

    def handler_response(self, msg):
        '''处理请求响应'''

        is_continue = True
        if msg.tool_calls:
            # 记录完整的assistant消息到对话历史
            self._append_assistant_message(msg)

            for tool_call in msg.tool_calls:
                if tool_call.function.name == 'load_file':
                    # 加载文件
                    self._load_file(tool_call)
                    
                elif tool_call.function.name == 'write_markdown_file':
                    # 写md
                    self._write_markdown_file(tool_call)
                    is_continue = False
                else:
                    raise ValueError(f"未知工具调用: {tool_call.function.name}")
                
            # 把工具调用完成后才开始发送请求
            if is_continue: self.handler_send_message()
        else:
            # 添加返回的响应到上下文
            self.send_message.append(msg)
            # 需要用户决策来完成关闭会话
            self._trigger_user_interaction(msg)

    def _load_file(self, tool_call):
        try:
            args = json.loads(tool_call.function.arguments)
            print(Back.GREEN + f"正在加载的文件：{args['file_path']}")

            # 调用服务端的方法
            result = self.server.load_file(
                args['file_path'],
                args.get('focus_lines', [])
            )

            # 继续对话
            self.manage_context({
                "role": 'tool',
                "content": json.dumps(result),
                "tool_call_id": tool_call.id
            })
        except Exception as e:
            print(Fore.RED + '工具调用失败：', str(e))

    def _write_markdown_file(self, tool_call):
        try:
            args = json.loads(tool_call.function.arguments)
            print(Back.GREEN + f"正在写文件：{args['file_name']}")

            # 调用服务端的方法
            self.server.write_markdown_file(
                args['markdown_content'],
                args.get('file_name', 'output.md')
            )
        except Exception as e:
            print(Fore.RED + '工具调用失败：', str(e))

    def _need_user_decision(self, content):
        """智能检测是否需要用户输入"""
        decision_keywords = [
            '是否需要', '请确认', '请选择', 
            '下一步', '请指示', '请决定'
        ]
        return any(key in content for key in decision_keywords)
    
    def _trigger_user_interaction(self, msg):
        """启动用户交互流程"""
        print(Back.BLUE + f"\n[系统提示] {msg.content}")
        print(Fore.RED + f"\n[用户输入指令]：")
        user_input = input()

        # 添加用户响应到上下文
        self.manage_context({
            "role": "user",
            "content": user_input
        })
        
        # 根据用户输入动态处理
        self.waiting_user_input = False
        self.handler_send_message()
    
    def _append_assistant_message(self, msg):
        '''管理工具消息'''
        assistant_msg = {
            "role": "assistant",
            "content": msg.content,
            "tool_calls": []
        }
        # 转换tool_calls结构
        for tc in msg.tool_calls:
            assistant_msg["tool_calls"].append({
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments
                }
            })
        self.manage_context(assistant_msg)

    def manage_context(self, messages):
        """上下文长度管理"""
        MAX_HISTORY = 20
        self.send_message.append(messages)
        if len(self.send_message) > MAX_HISTORY:
            # 保留最新的10条+系统消息
            self.send_message = [self.send_message[0]] + self.send_message[-10:]

if __name__ == '__main__':
    client = Client()
    path = os.path.join(os.getcwd(), 'game/assets/typescript/game.ts')
    request_message = client.server.load_file(path)
    client.manage_context({
        "role": "user",
        "content": '请调用 load_file 工具请求游戏目录下的 game.ts'
    })
    client.handler_send_message()