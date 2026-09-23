# Túi Nhỏ

[![Download APK](https://img.shields.io/badge/Download-APK-3DDC84?logo=android&logoColor=white)](#download)
[![Latest release](https://img.shields.io/github/v/release/aiThss/finance?display_name=tag&label=Latest%20release&logo=github)](#download)

Ứng dụng thu chi cá nhân tiếng Việt, ưu tiên điện thoại Android. React web → PWA → cùng bản build Vite trong Capacitor 8. Dữ liệu ở IndexedDB trên thiết bị, không đăng nhập và không đồng bộ đám mây.

## Download

- [Download APK v0.0.1 (unsigned)](https://github.com/aiThss/finance/releases/download/v0.0.1/finance-v0.0.1-unsigned.apk)
- [View release page and notes](https://github.com/aiThss/finance/releases/tag/v0.0.1)

> Bản APK hiện là unsigned vì repo chưa cấu hình keystore release; cần ký bằng keystore riêng trước khi phát hành chính thức.

## Dùng được gì?

- Thu, chi, chuyển tiền; sửa, tìm kiếm, lọc và xóa có hoàn tác/thùng rác.
- Tài khoản tiền mặt, ngân hàng, ví điện tử, tiết kiệm, tín dụng; sắp xếp và lưu trữ.
- Danh mục riêng, ngân sách tháng, lịch thu chi chờ xác nhận từng kỳ.
- Báo cáo thu chi, dòng tiền, danh mục/cửa hàng, lịch sử tổng số dư.
- JSON sao lưu/khôi phục toàn bộ có kiểm tra và xác nhận; CSV giao dịch.
- Gemini 3.8 Flash nhập bằng lời, đọc ảnh hóa đơn và giải thích số liệu tổng hợp. AI chỉ đề xuất; phải duyệt và lưu trong form giao dịch.
- Giao diện tối/sáng/theo hệ thống, ẩn tiền, cài như PWA, hoạt động ngoại tuyến sau lần tải đầu.

## Chạy web

Yêu cầu Node.js 24 LTS, npm và trình duyệt hiện đại hỗ trợ IndexedDB. Không cần Android Studio để phát triển web.

```sh
npm ci
npm run dev
```

Mở `http://localhost:5173`. Để chạy cả proxy AI, sao chép `.env.example` thành `.env`, điền biến phía server rồi mở terminal thứ hai:

```sh
npm run server:dev
```

Vite chuyển tiếp `/api` đến port 3000. Khi dev, `ALLOWED_ORIGINS` cần chứa `http://localhost:5173`. Không có Gemini key, tất cả tính năng thu chi vẫn hoạt động.

## Kiểm tra và production

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm start
```

`npm start` phục vụ `dist/` và `/api` cùng port 3000. `npm run preview` chỉ xem frontend. E2E kiểm tra bản production qua Vite preview, gồm offline, thu/chi/chuyển, sửa/xóa/hoàn tác, ngân sách, định kỳ, backup/restore, AI bản nháp với phản hồi giả lập và các chiều rộng 320/390/412/768/1280.

**Deploy Dokploy với domain có sẵn: [hướng dẫn từng bước](docs/DOKPLOY.md).** Dockerfile nhiều giai đoạn, tiến trình không chạy root, health check `/api/health`. Không cần database server hoặc volume cho bản V1.

## Kiến trúc

| Phần | Trách nhiệm |
| --- | --- |
| `src/domain` | Zod schema, số nguyên đồng, số dư, thu chi, ngân sách, ngày định kỳ |
| `src/db` | Dexie versioning, seed danh mục lần đầu, repositories, backup |
| `src/features` | Các màn hình; Reports và AI tải riêng |
| `src/components` | Sheet có focus trap, primitives và hàng giao dịch |
| `src/styles` | Semantic tokens, mobile first, reduced motion |
| `src/locales` | Điểm vào ngôn ngữ; hiện chỉ cung cấp tiếng Việt/VND |
| `server` | Express proxy + Google GenAI Interactions API, Zod request/response |
| `android` | Capacitor; không có UI tài chính thứ hai |

Mọi mutation giao dịch đi qua `transactionRepository`. Số dư = số dư ban đầu + thu − chi + chuyển vào − chuyển ra + điều chỉnh. Không có cột số dư hiện tại để đồng bộ. Chuyển tiền không tính vào thu/chi hoặc ngân sách. Dùng BigInt khi cộng và phân tích tiền; lưu số nguyên an toàn trong IndexedDB. Một số tiền tối đa 1.000 tỷ VND; tổng vượt giới hạn số nguyên an toàn sẽ báo lỗi.

Ngày báo cáo theo múi giờ thiết bị. ISO timestamp lưu thời điểm; đổi múi giờ có thể đổi ngày/tháng hiển thị của giao dịch sát nửa đêm. Lịch tháng giữ ngày neo (ví dụ 31/1 → 28/2 → 31/3). Xác nhận lịch và tạo giao dịch cùng một transaction DB, kiểm tra kỳ đến hạn để tránh ghi trùng. Tài khoản lưu trữ vẫn tính vào tổng tài sản. Nợ thẻ nhập số dư ban đầu âm.

Danh sách giao dịch chia trang 60 mục để giới hạn số hàng DOM; báo cáo hiện đọc dữ liệu vào bộ nhớ và phù hợp quy mô thu chi cá nhân. Các phép tính tiền nằm trong domain, không dùng AI làm máy tính. Không có analytics, Three.js, WebGL hay hiệu ứng chạy liên tục.

## Gemini và quyền riêng tư

Thiết lập phía **server**:

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
ALLOWED_ORIGINS=https://finance.example.com
AI_ACCESS_TOKEN=
PORT=3000
```

Điền key vào biến môi trường thật của máy chủ/Dokploy, không commit. `AI_ACCESS_TOKEN` là mã truy cập tùy chọn bảo vệ quota proxy công khai; nên đặt chuỗi ngẫu nhiên dài, nhập ở Cài đặt ứng dụng (chỉ lưu sessionStorage). Đây không phải Gemini API key. Web same-origin để `VITE_API_BASE_URL` trống. Android đặt `VITE_API_BASE_URL=https://finance.example.com` **khi build**, và thêm `https://localhost` vào danh sách origins server. Frontend chỉ chứa URL công khai, không chứa key.

Proxy sử dụng SDK `@google/genai`, Interactions API, `store: false`, thinking thấp cho trích xuất và vừa cho diễn giải. JSON theo schema và kiểm tra Zod cả hai phía; backend không truy cập DB trên thiết bị. Consent trước lần gửi đầu; chọn ảnh chưa gửi lên cho đến khi bấm gửi. AI có thể sai: mọi bản nháp phải qua form duyệt.

Giới hạn: ảnh 4 MB ở UI, body 6 MB ở server, 10 yêu cầu/phút/IP, 120 yêu cầu/giờ/toàn tiến trình, timeout 25 giây. Không log ảnh hay payload. CORS chỉ cho origin được cấu hình; CORS không thay thế mã truy cập. Rate limiter in-memory dành cho **một replica**. Khi scale, thay store bằng Redis dùng chung và đặt quota nhà cung cấp. `TRUST_PROXY` mặc định chỉ tin mạng nội bộ/loopback của reverse proxy; không public port container và không đặt `trust proxy=true` tùy tiện.

Không có credential trong repo nên kiểm thử AI tự động dùng mock. Sau khi cấu hình key thật, kiểm tra ba endpoint với một ví dụ không nhạy cảm trước khi dùng dữ liệu thật. Chính sách xử lý dữ liệu của Google vẫn áp dụng dù tắt lưu lịch sử Interactions.

Tham khảo chính thức: [Interactions](https://ai.google.dev/gemini-api/docs/interactions-overview), [structured output](https://ai.google.dev/gemini-api/docs/structured-output).

## PWA / offline

Sau lần tải đầu qua HTTPS (localhost được miễn), chọn cài ứng dụng trên Chrome Android. Service worker precache toàn bộ shell và các route lazy; `/api` không cache. Có bản mới thì thông báo; chỉ reload khi bạn chọn cập nhật. Hộp cập nhật không xuất hiện khi sheet đang mở. Lưu giao dịch trước khi cập nhật.

Chuyển domain, trình duyệt hoặc từ PWA sang APK tạo vùng lưu trữ khác. Hãy xuất JSON và nhập vào nơi mới. Không xóa site data trước khi sao lưu. Có thể yêu cầu persistent storage trong Cài đặt nhưng trình duyệt có quyền từ chối.

## Sao lưu / khôi phục

JSON có `schemaVersion: 1`, ngày xuất, tài khoản, danh mục, giao dịch gồm thùng rác, ngân sách, định kỳ và cài đặt. Restore kiểm tra schema/ID/references, hiển thị số lượng và yêu cầu gõ `THAY THẾ`; toàn bộ thay thế trong một transaction IndexedDB. Lỗi sẽ rollback. Không gộp, không tự tải dữ liệu lên server. Consent AI reset sau restore. CSV bảo vệ formula injection, chỉ chứa giao dịch chưa xóa.

**Bản sao hiện chưa mã hóa.** Chỉ giữ nơi riêng tư; mã hóa file bằng công cụ tin cậy nếu cần. Trên Android dùng Filesystem cache + native Share; trên web dùng download/upload. Không lưu mã truy cập AI trong backup.

DB bắt đầu với Dexie version 1; version 2 thêm migration metadata order/anchorDay, giữ nguyên số tiền. Khi đổi cấu trúc, tăng version và thêm hàm upgrade rõ ràng; không đổi ý nghĩa version cũ. Backup version phải có migration riêng trước khi chấp nhận version mới; hiện từ chối version không hỗ trợ. Seed chỉ chạy khi chưa có settings. Demo chỉ có trong dev và chỉ tạo khi không có tài khoản.

## Android

Project đã có Capacitor Android 8; app ID `com.aithss.finance` (đổi trước khi phát hành nếu cần). UI lấy trực tiếp từ `dist/`.

1. Cài Android Studio, Android SDK theo `android/variables.gradle` và JDK 21. Thiết lập `JAVA_HOME`, `ANDROID_HOME` hoặc `android/local.properties` với `sdk.dir` (không commit đường dẫn cá nhân).
2. Nếu dùng AI, đặt URL HTTPS backend lúc build. PowerShell: `$env:VITE_API_BASE_URL='https://finance.example.com'`; bash: `export VITE_API_BASE_URL=https://finance.example.com`.
3. `npm run android:sync` để build web và copy sang Android.
4. `npm run android:open` để mở Android Studio hoặc `npm run android:build` để tạo debug APK.
5. Debug APK ở `android/app/build/outputs/apk/debug/app-debug.apk`.

Release: chọn Build → Generate Signed App Bundle / APK trong Android Studio, tạo keystore riêng, tăng `versionCode`/`versionName` trong `android/app/build.gradle`; build bản release đã ký. Không commit keystore/password. CLI tương đương `cd android && ./gradlew bundleRelease` sau khi cấu hình signing. Bản unsigned không đủ để phát hành. Web không phụ thuộc Android SDK.

Safe-area CSS, resize khi bàn phím mở, Android back đóng sheet và hỏi khi chưa lưu. Cần smoke-test trên thiết bị Android thật trước phát hành store: bàn phím, back, native share, splash/status bar, cập nhật và dữ liệu offline. Xem [tài liệu Capacitor Android](https://capacitorjs.com/docs/android).
