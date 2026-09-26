# Heo Nhỏ Design System & Aesthetics

## I. Định Hướng Thẩm Mỹ Liquid Glass (Liquid Glass Aesthetic Direction)
Hệ thống giao diện của Heo Nhỏ hướng tới phong cách **Liquid Glass (Kính lỏng quang học)** cao cấp: rực rỡ sắc màu, chiều sâu phân tầng rõ rệt, vát sáng cạnh thủy tinh (specular highlight), phản quang ngầm (ambient mesh) và bảo đảm độ mượt mà tuyệt đối 60–120 FPS trên thiết bị di động.

---

## II. Hệ Thống Quy Tắc Màu Sắc (Color System Rules)

### 1. Nền Kính & Quang Sai Vật Lý (Optical Glass Tokens)
- `--bg`: Dark mode `#0A0E0C` (Obsidian Onyx); Light mode `#F6F8F5` (Pristine Milk). Định dạng mã Hex 6 ký tự bắt buộc để đồng bộ Android Native Window/SplashScreen.
- `--glass-canvas-mesh`: Lớp tán xạ ngầm đa sắc `body::before` (Lục bảo & Lam ngọc) tạo chiều sâu không gian khi cuộn trang.
- `--glass-l1`: Bề mặt kính chính cho Thẻ số dư (Balance Card) và Thẻ tổng quan tháng (`rgba(20, 26, 22, 0.65)` / `blur(24px)`).
- `--glass-l2`: Bề mặt Chrome cho Floating Bottom Nav Dock và Sticky Mobile Header (`rgba(24, 32, 27, 0.84)`).
- `--glass-l3`: Lõm kính (Wells) cho thanh tìm kiếm, bộ chọn kỳ, input (`rgba(14, 18, 15, 0.55)`).
- `--glass-sheet`: Kính đặc quang học 94% (`rgba(20, 26, 22, 0.94)`) cho Bottom Sheet để đạt độ phản quang mà không gây tải phụ cho GPU.
- `--specular-top`: Vát cạnh phản xạ mép trên mô phỏng khúc xạ ánh sáng thực (`rgba(255, 255, 255, 0.22)` Dark / `0.95` Light).
- `--specular-border`: Viền bao mỏng 1px (`rgba(255, 255, 255, 0.09)` Dark / `rgba(0, 0, 0, 0.08)` Light).
- `--glass-shadow`: Bóng đổ phân tầng tạo cảm giác bồng bềnh (`0 14px 36px -4px rgba(0, 0, 0, 0.45)`).

### 2. Màu Ngữ Nghĩa Tài Chính Đạt Chuẩn WCAG (WCAG Verified Semantic Palette)
Chữ và chỉ số tài chính tuân thủ nghiêm ngặt chuẩn tương phản quốc tế (Contrast Ratio - CR):

| Trạng thái | Dark Mode (CR trên Canvas) | Light Mode (CR trên Canvas) | Ý nghĩa tâm lý & Ứng dụng |
|---|---|---|---|
| **Thu nhập (`--income`)** | `#10B981` *(CR: 7.66:1 — **AAA**)* | `#047857` *(CR: 5.14:1 — **AA**)* hoặc `#065F46` *(CR: 7.19:1 — **AAA**)* | Tăng trưởng, thịnh vượng, an tâm |
| **Chi tiêu (`--expense`)** | `#F43F5E` *(CR: 5.29:1 — **AA**)* | `#BE123C` *(CR: 5.89:1 — **AA**)* hoặc `#9F1239` *(CR: 7.51:1 — **AAA**)* | Cảnh báo tinh tế, rõ nét, dễ đọc |
| **Chuyển khoản (`--transfer`)** | `#06B6D4` *(CR: 8.00:1 — **AAA**)* | `#0369A1` *(CR: 5.56:1 — **AA**)* hoặc `#075985` *(CR: 7.08:1 — **AAA**)* | Dòng chảy luân chuyển cân bằng |
| **Cảnh báo ngân sách (`--warning`)** | `#F59E0B` *(CR: 9.05:1 — **AAA**)* | `#B45309` *(CR: 5.58:1 — **AA**)* | Ngưỡng 80% ngân sách |
| **Vượt ngân sách (`--danger`)** | `#EF4444` *(CR: 5.16:1 — **AA**)* | `#B91C1C` *(CR: 5.92:1 — **AA**)* | Vượt 100% ngân sách |
| **Màu nhấn (`--accent`)** | `#34D399` / `#C2D9A9` *(CR > 7:1)* | `#15803D` / `#2D6A4F` *(CR > 5.5:1)* | Nút chính, tab chọn |

### 3. Bộ 16 Màu Ngọc Danh Mục (Jewel Category Palette)
Thay thế toàn bộ các màu xám đơn điệu cũ bằng bảng màu 16 viên ngọc quý sống động.
- **Quy tắc thích ứng tự động (Auto-adaptation)**:
  - Dark Mode: Icon mang màu ngọc rực rỡ trên nền kính mờ tinted 16%.
  - Light Mode: Áp dụng công thức `color-mix(in srgb, var(--cat-color) 55%, #000000)` để tự động làm sẫm màu icon lên chuẩn tương phản WCAG AA/AAA (> 5.5:1), trên nền trắng pha 15% màu ngọc.

| STT | Danh mục | Mã màu ngọc gốc | Tên ngọc thị giác |
|---|---|---|---|
| 1 | **Ăn uống** | `#F97316` | Coral Tangerine |
| 2 | **Cà phê** | `#D97706` | Roasted Amber |
| 3 | **Di chuyển** | `#0284C7` | Ocean Blue |
| 4 | **Mua sắm** | `#D946EF` | Electric Magenta |
| 5 | **Gia đình** | `#6366F1` | Royal Indigo |
| 6 | **Tiền nhà** | `#3B82F6` | Cobalt Blue |
| 7 | **Điện nước** | `#EAB308` | Luminous Gold |
| 8 | **Giải trí** | `#A855F7` | Violet Amethyst |
| 9 | **Sức khỏe** | `#F43F5E` | Vivid Rose |
| 10 | **Học tập** | `#0D9488` | Emerald Teal |
| 11 | **Quà tặng** | `#EC4899` | Radiant Pink |
| 12 | **Du lịch** | `#06B6D4` | Tropical Turquoise |
| 13 | **Khác** | `#64748B` | Slate Quartz |
| 14 | **Lương** | `#10B981` | Luminous Jade |
| 15 | **Thưởng** | `#F59E0B` | Solar Gold |
| 16 | **Thu nhập khác** | `#84CC16` | Lime Peridot |

### 4. Quy Tắc Nhận Diện Thị Giác Cho 5 Loại Tài Khoản (Account Visual Identity)
Không dùng chung 1 icon xám cho tất cả ví; mỗi loại tài khoản có biểu tượng và màu ngọc nhận diện chuyên biệt:
- **Tiền mặt (`cash`)**: Icon Banknote — Màu Ngọc Lục Bảo `#10B981`.
- **Ngân hàng (`bank`)**: Icon Building2/Landmark — Màu Xanh Coban `#3B82F6`.
- **Ví điện tử (`ewallet`)**: Icon Smartphone/QrCode — Màu Tím Magenta `#D946EF`.
- **Tiết kiệm (`savings`)**: Icon PiggyBank — Màu Vàng Hoàng Kim `#F59E0B`.
- **Thẻ tín dụng (`credit`)**: Icon CreditCard — Màu Hồng San Hô `#F43F5E`.

---

## III. Quy Tắc Kỹ Thuật & Hiệu Năng GPU (GPU Glass Budget Rules)

1. **Chống lỗi Double-Blur trên Bottom Sheet**:
   - Chỉ áp dụng `backdrop-filter: blur(14px)` trên lớp phủ `dialog::backdrop`.
   - Thân `.sheet` sử dụng nền kính quang học đục 94% (`--glass-sheet`) kết hợp viền vát sáng `inset 0 1px 1px 0 rgba(255, 255, 255, 0.22)`.
   - Tuyệt đối không bật blur thứ hai trên `.sheet` để loại bỏ 100% hiện tượng sụt FPS khi trượt mở modal.
2. **Ngân sách GPU trên danh sách cuộn**:
   - Các hàng giao dịch (`.transaction-row`) và khối ngày (`.day-group`) không dùng `backdrop-filter`. Hiệu ứng kính được thể hiện qua màu nền tĩnh bán trong suốt kết hợp đường viền specular 1px.
3. **Thanh điều hướng đáy thích ứng (Adaptive Bottom Dock)**:
   - Màn hình chuẩn (> 359px): Thả nổi cách đáy `calc(12px + env(safe-area-inset-bottom))`, cách lề `16px`, bo tròn `26px`.
   - Màn hình nhỏ (≤ 359px): Áp sát mép dưới (docked), bo 2 góc trên `20px` để bảo toàn toàn bộ không gian cho 5 tab chữ tiếng Việt.
   - Nút "Ghi chép" trung tâm dạng Glowing Jewel Pill với viền hào quang phát quang dạ ngọc.
4. **Thanh Mobile Header kính mờ cố định (Sticky Frosted Header)**:
   - Cấu hình `position: sticky; top: 0; z-index: 15; backdrop-filter: blur(16px);`.
   - Danh sách giao dịch khi cuộn sẽ lướt mờ dần bên dưới header.
5. **Khung kết quả AI lăng kính ánh sáng (Prismatic Aurora Border)**:
   - Bọc viền chuyển sắc gradient `#A855F7` → `#06B6D4` → `#10B981` xung quanh khung kết quả AI.

---

## IV. Động Lực Học & Tương Tác Vi Mô (Micro-Interactions)
- **Đường cong chuyển động**: Sử dụng đường cong chất lỏng iOS `cubic-bezier(0.16, 1, 0.3, 1)`. Sheet trượt vào 260ms, đóng 160ms, chuyển tab 200ms.
- **Nảy xúc giác quang học**: Nút bấm, jewel badge và thẻ giao dịch co nhẹ `transform: scale(0.975)` khi chạm (`:active`).
- **Trợ năng & Tiết kiệm pin**: `@media (prefers-reduced-motion: reduce)` tự động tắt blur, tắt co giãn và chuyển sang nền đục tiết kiệm năng lượng.
