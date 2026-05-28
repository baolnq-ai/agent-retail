# Script benchmark

Thư mục này chứa script chạy benchmark thật qua API.

Yêu cầu vận hành:

- Chạy tuần tự, không song song request LLM.
- Có delay giữa các case.
- Ghi checkpoint sau từng case để resume được.
- Không dùng mock response hoặc fallback giả.
