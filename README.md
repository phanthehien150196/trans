# Công cụ dịch thuật AI

Ứng dụng dịch thuật giúp dịch văn bản với việc quản lý xưng hô, mối quan hệ, văn phong và các yêu cầu tùy chỉnh. Ứng dụng sử dụng AI từ Google Gemini để tạo bản dịch chất lượng cao.

## Cài đặt

### Cài đặt từ GitHub
1. Clone repository:
   ```
   git clone https://github.com/phanthehien150196/trans.git
   hoặc Download ZIP
   ```
2. Mở thư mục dự án:
   ```
   cd trans
   ```
3. Mở file `index.html` trong trình duyệt của bạn

## Tính năng

- Giao diện thân thiện với người dùng
- Quản lý nhân vật và mối quan hệ
- Thiết lập xưng hô giữa các nhân vật
- Quản lý biểu hiện/dạng thoại cho từng dòng văn bản
- Upload văn bản gốc từ file TXT
- Gán nhân vật và biểu hiện cho từng dòng văn bản
- Tùy chọn giữ nguyên văn bản gốc cho các dòng cụ thể
- Nhập bối cảnh, văn phong và thể loại
- Tùy chỉnh yêu cầu dịch thuật
- Lưu và tải cài đặt từ trình duyệt
- Xuất và nhập file cài đặt JSON
- Loại bỏ định dạng Markdown tự động
- Trau chuốt hai lần cho kết quả dịch chất lượng cao

## Hướng dẫn sử dụng

1. **API Key**: Đăng ký tài khoản tại [Google AI Studio](https://aistudio.google.com/apikey) và nhập API key vào ứng dụng.
2. **Thiết lập nhân vật**: Thêm các nhân vật trong câu chuyện của bạn.
3. **Thiết lập mối quan hệ**: Mô tả mối quan hệ giữa các nhân vật (ví dụ: "A là em gái của B").
4. **Thiết lập xưng hô**: Chọn cách các nhân vật gọi nhau và cách họ tự xưng.
5. **Thiết lập biểu hiện/dạng thoại**: Thêm các biểu hiện hoặc dạng thoại (vui vẻ, buồn bã, thì thầm, v.v.)
6. **Upload văn bản**: Tải lên tệp văn bản cần dịch (định dạng TXT).
7. **Gán thuộc tính cho từng dòng**: Chọn nhân vật và biểu hiện cho từng dòng văn bản.
8. **Thêm thể loại và văn phong**: Chỉ định thể loại và văn phong mong muốn.
9. **Nhập yêu cầu và bối cảnh**: Thêm các yêu cầu dịch thuật chi tiết và bối cảnh truyện.
10. **Dịch thuật**: Nhấn nút "Dịch văn bản" để xử lý.
11. **Lưu cài đặt**: Sử dụng các nút để lưu cài đặt vào trình duyệt hoặc tải xuống.

### Lưu trữ cài đặt

- **Lưu cài đặt**: Lưu cài đặt vào bộ nhớ của trình duyệt
- **Load cài đặt**: Khôi phục cài đặt từ bộ nhớ trình duyệt
- **Tải file cài đặt**: Tải xuống file cài đặt JSON để lưu trữ dài hạn
- **Nhập file cài đặt**: Tải cài đặt từ file JSON đã lưu trước đó

### Quản lý văn bản gốc

Sau khi tải lên văn bản, mỗi dòng sẽ được tách riêng và hiển thị trong bảng với các cột:
- **STT**: Số thứ tự của dòng
- **Nhân vật**: Chọn nhân vật phát ngôn (nếu có)
- **Biểu hiện/dạng thoại**: Chọn biểu hiện hoặc dạng thoại cho dòng văn bản
- **Văn bản gốc**: Nội dung dòng văn bản

Thông tin này sẽ được đưa vào prompt gửi cho AI để giúp AI hiểu rõ hơn về văn bản và tạo bản dịch chính xác hơn.

#### Giữ nguyên văn bản gốc

Nếu bạn muốn một số dòng văn bản giữ nguyên không dịch, bạn có thể chọn "Giữ nguyên" trong mục biểu hiện/dạng thoại. Các dòng này sẽ được AI bỏ qua trong quá trình dịch và giữ nguyên như văn bản gốc. Tính năng này đặc biệt hữu ích đối với:
- Tên riêng, địa danh không cần dịch
- Câu nói bằng ngôn ngữ khác muốn giữ nguyên
- Thuật ngữ chuyên ngành, từ khóa kỹ thuật cần giữ nguyên

### Kết quả dịch thuật

Kết quả dịch được hiển thị dưới dạng văn bản thuần túy, với tất cả định dạng Markdown được tự động loại bỏ để đảm bảo tính nhất quán. Nút **Sao chép kết quả** cho phép sao chép toàn bộ nội dung đã được loại bỏ định dạng.

#### Quy trình trau chuốt hai lần

Ứng dụng áp dụng quy trình dịch thuật hai bước để đảm bảo chất lượng cao nhất:

1. **Bước 1: Dịch thuật cơ bản** - AI dịch văn bản gốc theo yêu cầu, giữ nguyên xưng hô và cấu trúc
2. **Bước 2: Trau chuốt tăng cường** - Bản dịch đầu tiên được gửi lại cho AI để trau chuốt thêm một lần nữa với yêu cầu nâng cao văn phong, làm cho văn bản hay và cảm xúc hơn, đồng thời vẫn giữ nguyên xưng hô và nội dung

Người dùng có thể theo dõi tiến trình của từng bước thông qua thanh trạng thái hiển thị trong quá trình dịch. Kết quả cuối cùng là bản dịch đã được trau chuốt, có văn phong tự nhiên, phong phú về cảm xúc và chính xác về mặt nội dung.

## Lưu ý

- API key của Google Gemini được lưu trong máy của bạn và không được gửi đi nơi khác.
- Ứng dụng sử dụng mô hình AI là Google Gemini Flash Thinking để đảm bảo chất lượng dịch thuật cao.
- Hãy đảm bảo có kết nối internet ổn định khi sử dụng ứng dụng.

## Tính năng thông minh

- **Tránh trùng lặp xưng hô**: Hệ thống ngăn người dùng tạo xưng hô trùng lặp giữa các nhân vật, giúp đảm bảo tính nhất quán
- **Lưu cài đặt tự động**: Mỗi khi thực hiện thay đổi, hệ thống tự động lưu lại cài đặt
- **Tải cài đặt khi khởi động**: Khi mở lại ứng dụng, các cài đặt trước đó sẽ tự động được khôi phục
- **Lưu đầy đủ tất cả cài đặt**: Tất cả thông tin (nhân vật, mối quan hệ, xưng hô, thể loại, văn phong, yêu cầu, bối cảnh, văn bản gốc) đều được lưu lại

## Lưu trữ dữ liệu

Dữ liệu của ứng dụng được lưu trữ dưới dạng file JSON trên máy tính của bạn thay vì sử dụng localStorage của trình duyệt. Điều này giúp dữ liệu được bảo quản an toàn hơn và có thể dễ dàng chuyển đổi giữa các thiết bị.

- Nhấn nút **Tải file cài đặt** để tải xuống file cài đặt dưới dạng JSON.
- Nhấn nút **Nhập file cài đặt** để tải lên file cài đặt đã lưu trước đó.
- Ứng dụng cũng sẽ tự động lưu cài đặt định kỳ mỗi 60 giây nếu có sự thay đổi.
- Bạn sẽ được cảnh báo khi rời khỏi trang mà chưa lưu thay đổi.

## Hỗ trợ

Nếu bạn gặp vấn đề với ứng dụng, vui lòng liên hệ để được hỗ trợ.

---

© 2025 Ứng dụng Dịch Thuật AI 
