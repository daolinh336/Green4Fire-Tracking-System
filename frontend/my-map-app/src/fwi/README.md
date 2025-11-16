0. chạy thử trên máy local: 
    chỉnh đường dẫn site cho hợp lệ trong lambda_function.py
    cd .\frontend\my-map-app\src\fwi\
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    python lambda_function.py
1. Đưa sites.json lên DB/S3
2. script lambda_function.py hiện tại đang đọc, ghi dữ liệu trên local.
   bên back end sẽ chuyển sang phiên bản đọc, ghi trên cloud.
3. không cần thay đổi fwi.py
4. tạo dockerfile và buid docker image
   tạo lambda A từ image trên 
   thiết lập chạy định kỳ 1 lần/ngày vào 12h trưa (giờ việt nam)
   
5. (!) khả năng cao sẽ đụng giới hạn 15p của lambda...