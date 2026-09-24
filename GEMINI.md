# Quy tắc dự án Túi Nhỏ (Finance)

## Quy trình Tự động Build APK & Release GitHub

Sau mỗi lần hoàn thành chỉnh sửa tính năng, sửa lỗi hoặc cải tiến code trên repository này, Agent BẮT BUỘC phải thực hiện quy trình release tự động:

1. **Tăng Version đồng bộ**:
   - Tăng version trong `package.json` và `package-lock.json` (ví dụ từ `1.0.19` lên `1.0.20`).
   - Tăng `androidVersionCode` trong `package.json` và `versionCode` trong `android/app/build.gradle` (luôn là số nguyên tăng đơn điệu).
   - Cập nhật `versionName` trong `android/app/build.gradle` khớp chính xác với `package.json`.

2. **Soạn thảo Release Notes**:
   - Tạo file `docs/releases/vX.Y.Z.md` tóm tắt các tính năng, cải tiến và sửa lỗi mới.

3. **Kiểm tra & Xác minh (Verification)**:
   - Chạy `npm run verify:version`
   - Chạy `npm run lint`
   - Chạy `npm test`
   - Chạy `npm run build:android:release`
   - Chạy `npm run verify:build`
   - Chạy `npx cap sync android`

4. **Commit & Tạo Git Tag**:
   - Tạo git commit theo chuẩn Conventional Commits (ví dụ: `release: vX.Y.Z - <mô tả ngắn>`).
   - Tạo git tag `vX.Y.Z` trỏ vào commit đó.

5. **Đẩy lên GitHub (Push Commit & Tag)**:
   - Tự động push commit lên branch `main`.
   - Tự động push tag `vX.Y.Z` lên `origin`.
   - Việc push tag `v*` sẽ kích hoạt GitHub Actions (`.github/workflows/android-release.yml`) tự động compile, ký chữ ký số phát hành (release keystore), chạy Android smoke test trên emulator và publish bản cài `tui-nho.apk` lên GitHub Releases chính thức.
