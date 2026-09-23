# Túi Nhỏ

[![Download APK](https://img.shields.io/badge/Download-APK-3DDC84?logo=android&logoColor=white)](https://github.com/aiThss/finance/releases/latest)
[![Latest release](https://img.shields.io/github/v/release/aiThss/finance?display_name=tag&label=Latest%20release&logo=github)](https://github.com/aiThss/finance/releases/latest)

Ứng dụng thu chi cá nhân tiếng Việt, ưu tiên điện thoại Android. React web → PWA → cùng bản build Vite trong Capacitor 8. Dữ liệu ở IndexedDB trên thiết bị, không đăng nhập và không đồng bộ đám mây.

## Download

- [Tải APK mới nhất](https://github.com/aiThss/finance/releases/latest/download/tui-nho.apk)
- [Trang download và ghi chú phiên bản](https://github.com/aiThss/finance/releases/latest)

> Từ v1.0.1, APK dùng khóa release cố định. APK v0.0.1 dùng khóa debug khác: hãy xuất JSON trong Cài đặt trước khi chuyển bản. Android không cho cài đè khi khác chữ ký; chỉ gỡ bản cũ sau khi đã lưu bản sao lưu an toàn, rồi cài bản mới và nhập JSON. Các bản release tiếp theo dùng cùng khóa để cập nhật tại chỗ.

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

**Người dùng tự nhập key:** mở Cài đặt → Trợ lý AI → Cách lấy API key. Vào [Google AI Studio](https://aistudio.google.com/api-keys), chọn Create API key, sao chép key và dán vào ứng dụng. Bấm Lưu API key rồi Kiểm tra key Gemini. Không chia sẻ key; quản lý quota/chi phí và thu hồi key bị lộ tại AI Studio.

Android lưu key mã hóa AES-GCM bằng Android Keystore trong vùng riêng của app; không xuất key ra JavaScript sau khi lưu, không đưa vào JSON backup, không có key trong APK. Bridge tắt logging để tránh ghi nội dung key lúc nhập. Yêu cầu HTTPS đi thẳng đến endpoint cố định của Google; không chuyển tiếp key qua backend và không dùng key trong URL. Xóa key trong Cài đặt chỉ xóa trên máy; muốn thu hồi hoàn toàn thì xóa tại AI Studio. Web giữ key cá nhân trong bộ nhớ tab, cần nhập lại khi reload. Thiết bị hoặc trang web bị xâm nhập vẫn có thể sử dụng key; mã hóa lưu trữ không thay thế bảo vệ thiết bị.

Dùng Gemini 3.8 Flash Interactions API với `store: false`. Người dùng xác nhận trước khi gửi nội dung/ảnh hoặc số liệu tổng hợp; ảnh tối đa 4 MB. Kết quả phải qua schema và màn hình duyệt trước khi lưu giao dịch. Chính sách dữ liệu/quota của Google vẫn áp dụng. Kiểm thử dùng key giả và phản hồi mock; cần key của người dùng để kiểm chứng một yêu cầu AI thành công.

Proxy Express cũ vẫn dành cho triển khai web có key phía server (`GEMINI_API_KEY`, `GEMINI_MODEL`, `ALLOWED_ORIGINS`). Không có key cá nhân thì web dùng proxy; Android luôn dùng key cá nhân. `VITE_API_BASE_URL` chỉ là URL proxy tùy chọn, không cần cho APK. Không đặt key vào biến `VITE_*` hoặc commit credential.

Tham khảo chính thức: [tạo và bảo vệ API key](https://ai.google.dev/gemini-api/docs/api-key), [Interactions](https://ai.google.dev/gemini-api/docs/interactions-overview), [Android Keystore](https://developer.android.com/privacy-and-security/keystore).

## PWA / offline

Sau lần tải đầu qua HTTPS (localhost được miễn), chọn cài ứng dụng trên Chrome Android. Service worker precache toàn bộ shell và các route lazy; `/api` không cache. Có bản mới thì thông báo; chỉ reload khi bạn chọn cập nhật. Hộp cập nhật không xuất hiện khi sheet đang mở. Lưu giao dịch trước khi cập nhật.

Chuyển domain, trình duyệt hoặc từ PWA sang APK tạo vùng lưu trữ khác. Hãy xuất JSON và nhập vào nơi mới. Không xóa site data trước khi sao lưu. Có thể yêu cầu persistent storage trong Cài đặt nhưng trình duyệt có quyền từ chối.

## Sao lưu / khôi phục

JSON có `schemaVersion: 1`, ngày xuất, tài khoản, danh mục, giao dịch gồm thùng rác, ngân sách, định kỳ và cài đặt. Restore kiểm tra schema/ID/references, hiển thị số lượng và yêu cầu gõ `THAY THẾ`; toàn bộ thay thế trong một transaction IndexedDB. Lỗi sẽ rollback. Không gộp, không tự tải dữ liệu lên server. Consent AI reset sau restore. CSV bảo vệ formula injection, chỉ chứa giao dịch chưa xóa.

**Bản sao hiện chưa mã hóa.** Chỉ giữ nơi riêng tư; mã hóa file bằng công cụ tin cậy nếu cần. Trên Android dùng Filesystem cache + native Share; trên web dùng download/upload. Không lưu mã truy cập AI trong backup.

DB bắt đầu với Dexie version 1; version 2 thêm migration metadata order/anchorDay, giữ nguyên số tiền. Khi đổi cấu trúc, tăng version và thêm hàm upgrade rõ ràng; không đổi ý nghĩa version cũ. Backup version phải có migration riêng trước khi chấp nhận version mới; hiện từ chối version không hỗ trợ. Seed chỉ chạy khi chưa có settings. Demo chỉ có trong dev và chỉ tạo khi không có tài khoản.

## Android

Project đã có Capacitor Android 8; giữ app ID `com.aithss.finance` để nâng cấp ứng dụng hiện có. UI lấy trực tiếp từ `dist/`.

1. Cài Android Studio, Android SDK theo `android/variables.gradle` và JDK 21. Thiết lập `JAVA_HOME`, `ANDROID_HOME` hoặc `android/local.properties` với `sdk.dir` (không commit đường dẫn cá nhân).
2. APK không cần backend riêng. Người dùng mở Cài đặt → Trợ lý AI để nhập key cá nhân từ Google AI Studio.
3. `npm run android:sync` để build web và copy sang Android.
4. `npm run android:open` để mở Android Studio hoặc `npm run android:build` để tạo debug APK.
5. Debug APK ở `android/app/build/outputs/apk/debug/app-debug.apk`.

Release: dùng khóa ký release hiện có, không tạo khóa thay thế. APK dùng Gemini API key do người dùng tự nhập trong Cài đặt; không cần `VITE_API_BASE_URL`. Chạy `npm run build:android:release` và `npx cap sync android`. Nếu vẫn cấu hình backend tùy chọn, gate kiểm tra health/CORS trước khi build. Khi phát hành phiên bản mới, đồng bộ version trong package.json/package-lock.json, `androidVersionCode` trong package.json và versionCode/versionName trong Gradle; `npm run verify:version` kiểm tra chúng. Không commit keystore/password. Bản unsigned hoặc ký debug không đủ để phát hành.

Safe-area CSS, resize khi bàn phím mở, Android back đóng sheet và hỏi khi chưa lưu. Cần smoke-test trên thiết bị Android thật trước phát hành store: bàn phím, back, native share, splash/status bar, cập nhật và dữ liệu offline. Xem [tài liệu Capacitor Android](https://capacitorjs.com/docs/android).

### Cập nhật APK khi sửa vùng thanh trạng thái
Bản sửa 23/09 dùng SystemBars của Capacitor để chừa vùng status bar, camera cutout và bàn phím trên Android; bỏ plugin StatusBar cũ và `resizeOnFullScreen`. Cần **build và cài APK mới**, redeploy Dokploy chỉ cập nhật web. Dùng cùng applicationId và khóa ký để nâng cấp tại chỗ; không gỡ app đang chứa dữ liệu.

GitHub Actions `Verify` có job `android-build` tạo artifact `tui-nho-debug-apk`, cài/mở APK trên emulator API 35 và lưu ảnh/diagnostics. Đây là bản debug, không thay thế APK release ký bằng khóa hiện tại. Xác minh trên điện thoại: mở lạnh, mọi tab, xoay ngang, mở bàn phím, Back và đóng form; kiểm tra cả điều hướng cử chỉ và 3 nút. Xem [báo cáo kiểm thử và các điều kiện còn thiếu](docs/stabilization.md).

### Phát hành APK tự động
Chỉ sau khi các điều kiện nghiệm thu đạt: tăng version trong package.json/package-lock.json, đồng bộ androidVersionCode và versionCode/versionName trong android/app/build.gradle, thêm docs/releases/vX.Y.Z.md rồi push tag vX.Y.Z. Repository variable `VITE_API_BASE_URL` là tùy chọn. Workflow Android Release kiểm tra backend, build, ký bằng hai GitHub Secrets ANDROID_RELEASE_KEYSTORE_BASE64 / ANDROID_RELEASE_KEYSTORE_PASSWORD, chạy native smoke trên APK đã ký rồi xuất APK cùng SHA-256 lên GitHub Releases. Không thay thế binary của phiên bản đã phát hành. Badge luôn mở releases/latest.
