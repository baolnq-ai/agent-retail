---
name: backend-skill
description: "Quy tắc bắt buộc khi thiết kế, viết và review code backend."
argument-hint: "backend task"
user-invocable: true
---

# Backend Skill
Áp dụng khi cần đụng backend

## Cấu trúc thư mục
```backend/
├── controllers/  # Xử lý logic của API
├── database/       # Định nghĩa schema và tương tác với database
├── routes/       # Định nghĩa các endpoint API
├── services/     # Xử lý logic nghiệp vụ
├── utils/        # Các hàm tiện ích chung
├── middlewares/  # Xử lý middleware (cors, authentication, v.v) 
├── config/       # Cấu hình ứng dụng (database, environment variables, v.v)
└── app.js, app.py, app.rb, v.v.v.        # Điểm vào của ứng dụng
```

## Quy tắc viết code
1. **Đặt tên rõ ràng**: Sử dụng tên biến, hàm, lớp có ý nghĩa và dễ hiểu.
2. **Tuân thủ nguyên tắc DRY (Don't Repeat Yourself)**: Tránh việc lặp lại mã nguồn bằng cách tái sử dụng hàm, lớp hoặc module.
3. **Sử dụng cấu trúc thư mục hợp lý**: Tổ chức mã nguồn theo cấu trúc thư mục rõ ràng.
4. **Viết tài liệu**: Viết tài liệu cho từng service của backend.
4. **Viết ghi chú**: Cung cấp tài liệu rõ ràng cho các hàm, lớp và module.
5. **Test code**: Sau khi xong 1 chức năng phải test request thật vào không smoke test để xem chức năng hoạt động đúng không.
6. **Clear code**: Loại bỏ mã nguồn dư, cũ, không sử dụng sau khi code, sửa hay update code.
7. **APi test**: Sau khi xong 1 enpoint phải test request thật vào không smoke test như postman, insomnia, v.v.
8. **Code review**: Mỗi lần code xong rà lại một lượt để xem code clean chưa.
9. **Database**: Luôn dùng database tuyệt đối không ghi dưới dạng file, excel, csv, v.v để lưu trữ dữ liệu trừ khi được yêu cầu từ tôi.
10. **Logs**: luôn có logs cho hệ thống.
11. **.env**: Lúc nào cần các thông tin cấu hình như database, secret key, v.v thì phải dùng .env để lưu trữ và đọc từ đó, tuyệt đối không ghi trực tiếp vào code. env ở ngoài source chính source to đang đứng không phải backend.
12. **Bảo mật**: Luôn tuân thủ các nguyên tắc bảo mật khi thiết kế và triển khai backend, như xác thực, phân quyền, mã hóa dữ liệu, v.v.
13. **Hiệu suất**: Tối ưu hóa hiệu suất của backend bằng cách sử dụng các kỹ thuật như caching, tối ưu truy vấn database, v.v.

## Quy tắc test api và test code:
1. **Không cần smoke hay unit test gì hết**: luôn test request thật vào để xem chức năng hoạt động đúng không.
2. **Đánh giá**: với mỗi lần test phải đánh giá kết quả, thời gian response luôn phải đạt kết quả tốt nhất với loại request đó.
3. **smoke - fallback**: Tuyệt đối không dùng fallback hay mock data để test, luôn dùng db thật để test, đảm bảo dữ liệu thật, kết quả thật, thời gian response thật, lỗi thì thông báo lên frontend thật, không che bằng fallback hay mock data.
4. **Test nhiều lần**: Với mỗi endpoint phải test nhiều lần với nhiều cách.
5. **Lưu**: Mỗi lần test phải lưu vào folder tests ngoài source tổng là source to đang đứng không phải backend dạng tests/backend tests/ tên service/loại test.md, ta sẽ lưu dạng như vậy, mỗi loại test chỉ 1 file rồi cập nhật liên tục đừng spam, mỗi service có 1 readme báo cáo và cập nhật liên tục readme rõ ràng và chi tiết, test mới nhất, các report chi tiết, v.v.v, thiết kế dễ nhìn.
6.**Không dừng nêú chưa xong**: Nếu bị dính quyền hay vướn gì thì không dừng mà gửi lựa chọn lại cho tôi để tôi có thể lựa chọn va bạn làm tiếp.

## Tuyệt đối không làm:
1. Code khi chưa rõ database, data, điểm pass của test, kiến trúc tổng thể cache, queue, frame work, loại api, bảo mật, v.v.
2. Dừng khi task chưa xong, chưa test xong, chưa review xong.
3. Smoke test, unit test, mock data, fallback để test.
4. Lưu dữ liệu dưới dạng file, excel, csv, v.v.

## Quy tắc viết documentation:
1. Tiếng việt có dấu, rõ ràng, chi tiết, dễ hiểu.
2. Cập nhật liên tục, không để tồn đọng.
3. Thiết kế dễ nhìn, có mục lục, phân chia rõ ràng.
4. có thời gian, ngày tháng rõ ràng.
5. Logs thông tin phải có chi tiết về những gì đã làm, kết quả, thời gian, v.v.v.
6. Docs ở ngoài source chính to chứ không phải backend, source chính/docs/backend/tên service.md, readme nằm ngay đây docs/backend/README.md.

## Quy tắt viết logs:
1. Logs ở đây là logs thông tin về đã làm gì chứ không phải log lỗi.
3. Logs thông tin là logs về việc trước đó đã làm gì mỗi ngày 1 file cho cả backend, logs lưu lại tại folder logs trong source chính source to đang đứng không phải backend, source chính/logs/backend/logs-runtime or logs-coding/logs.md, có readme báo cáo logs thông tin, cập nhật liên tục readme rõ ràng và chi tiết, logs mới nhất, v.v.v, thiết kế dễ nhìn.
4. Tức là mỗi service có 1 file logs thông tin theo ngày.
5. Tiếng việt có dấu, rõ ràng, chi tiết, dễ hiểu.


