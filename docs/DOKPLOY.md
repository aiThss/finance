# Deploy Túi Nhỏ bằng Dokploy

Mô hình: domain HTTPS → Traefik của Dokploy → **một container port 3000**, phục vụ React/PWA và API Gemini. Không cần thêm Nginx hay database server.

## 1. DNS của domain đã có

Chọn domain chính hoặc subdomain, ví dụ `finance.tenmiencuaban.com`. Tạo bản ghi **A** của host đó trỏ đến IP public của VPS chạy Dokploy. Chỉ giữ AAAA nếu VPS có IPv6 hoạt động. Mở 80/443 đến Traefik. Nếu dùng Cloudflare và cấp Let's Encrypt lần đầu, có thể để DNS only để dễ kiểm tra; sau đó bật proxy nếu muốn.

## 2. Tạo Application

Trong Dokploy: **Projects → Create Project** (hoặc project sẵn) → **Create Service → Application**.

- Source: GitHub, repository **aithss/finance**, branch **main**.
- Repo private: kết nối GitHub App/token của bạn trong Dokploy và cấp quyền repo này.
- Build Type: **Dockerfile**.
- Dockerfile Path: `Dockerfile`.
- Docker Context Path: `.` (root repository).
- Build Stage: để trống, dùng stage cuối `runtime`.
- Replica: **1** (rate limit hiện lưu trong RAM).

Đây là một application Dockerfile, không phải Static Site và không cần Compose.

## 3. Environment

Trong mục Environment, lưu các biến runtime sau; thay domain bằng domain thật:

```dotenv
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://finance.tenmiencuaban.com
GEMINI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=
AI_ACCESS_TOKEN=
```

- `GEMINI_API_KEY`: điền key Google AI Studio thật trực tiếp trong Dokploy. Không đưa vào Git, frontend, build arguments hay biến bắt đầu bằng `VITE_`.
- `AI_ACCESS_TOKEN`: nên đặt mã ngẫu nhiên dài để người lạ không dùng quota AI; người dùng nhập mã trong **Khác → Cài đặt → Mã truy cập AI**. Không dùng lại Gemini key làm mã này.
- Chưa cần AI: để trống `GEMINI_API_KEY`; web thu chi vẫn hoạt động đầy đủ.
- Web và API chung domain: **không cần** đặt `VITE_API_BASE_URL`. Frontend gọi `/api/...` cùng origin.
- Có dùng APK: bổ sung origin, ví dụ `ALLOWED_ORIGINS=https://finance.tenmiencuaban.com,https://localhost`. Build APK riêng với `VITE_API_BASE_URL=https://finance.tenmiencuaban.com`.

Biến `VITE_*` là biến **build-time**. Nếu sau này tách web/API, cấu hình Docker build argument `VITE_API_BASE_URL` và rebuild; đổi runtime env riêng không thay URL đã đóng gói trong JS.

## 4. Gắn domain và SSL

Trong Application → **Domains → Add Domain**:

| Trường | Giá trị |
| --- | --- |
| Host | `finance.tenmiencuaban.com` (không kèm `https://`) |
| Path | `/` |
| Internal Path | `/` nếu giao diện yêu cầu |
| Container Port | **3000** |
| HTTPS | Bật |
| Certificate Provider | Let's Encrypt |

Không publish port 3000 ra internet trong phần Advanced Ports. Container Port của domain là cổng Traefik route vào container, không phải cổng cần mở public.

Save rồi **Deploy**. Đợi build và container healthy. Log chỉ báo server ready, không có dữ liệu tài chính hoặc key. Bật Auto Deploy theo nhánh `main` nếu bạn muốn mỗi push tự deploy.

## 5. Kiểm tra sau deploy

1. Mở `https://finance.tenmiencuaban.com/api/health`. Mong đợi `{"ok":true,"aiConfigured":true}` khi đã có key; false nếu chưa cấu hình.
2. Mở domain, thêm tài khoản thử rồi tạo/sửa/xóa/hoàn tác một giao dịch. Xóa dữ liệu thử bằng restore một backup trống nếu cần, không trộn với sổ thật.
3. Mở trực tiếp `/reports` rồi refresh để kiểm tra SPA routing.
4. Chrome Android → Install app. Sau lần tải đầu, tắt mạng, mở lại app và thử ghi một khoản. AI sẽ báo ngoại tuyến, phần thu chi vẫn hoạt động.
5. Bật AI ở Cài đặt, nhập mã truy cập nếu đã đặt. Gửi ví dụ `ăn phở 55k`, kiểm tra bản nháp; số dư chỉ thay đổi sau khi bấm **Lưu giao dịch**.
6. Thử xuất và khôi phục JSON trước khi nhập nhiều dữ liệu thật.

## Lỗi thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| 502 Bad Gateway | Container có chạy không; domain trỏ Container Port 3000; process lắng nghe `0.0.0.0` |
| Chưa có HTTPS | DNS trỏ đúng VPS; 80/443 mở; AAAA không trỏ sai; kiểm tra certificate logs |
| AI báo chưa cấu hình | `GEMINI_API_KEY` là runtime env; redeploy/restart container sau khi đổi |
| AI 401 | Mã ở Settings phải khớp `AI_ACCESS_TOKEN`; mã mất khi đóng phiên là chủ ý |
| AI 403 | `ALLOWED_ORIGINS` khớp origin chính xác, không thêm dấu `/` cuối |
| AI 429 | Chờ quota phút/giờ hoặc kiểm tra quota Google; không tăng replica để né giới hạn |
| AI 502/504 | Kiểm tra key/model/quota và đường mạng đến Google; key không được log ra |
| Offline chưa hoạt động | Cần tải thành công một lần qua HTTPS và service worker cài xong |
| Đổi domain thấy sổ trống | IndexedDB gắn với origin; xuất JSON tại domain cũ rồi nhập tại domain mới |
| Bản mới chưa hiện | Bấm cập nhật khi có thông báo; tránh xóa site data vì sẽ xóa sổ |

## Dữ liệu, cập nhật và rollback

Dữ liệu tài chính lưu ở trình duyệt/thiết bị, không nằm trong container. Redeploy container không xóa sổ, nhưng backup server Dokploy cũng **không sao lưu sổ cá nhân**. Mỗi người dùng cần xuất JSON riêng. Không có đồng bộ nhiều thiết bị.

Trước đổi schema, lưu backup. Rollback image/code bằng deployment cũ của Dokploy chỉ rollback phần mềm; không tự hạ version IndexedDB. Giữ domain ổn định. Thay đổi API contract cần tương thích với PWA cũ trong thời gian người dùng chưa cập nhật.

Tài liệu chính thức: [Dokploy Domains](https://docs.dokploy.com/docs/core/domains), [Dockerfile example](https://docs.dokploy.com/docs/core/deno) (tham khảo cách chọn Dockerfile/context và port; ứng dụng này chạy Node).
