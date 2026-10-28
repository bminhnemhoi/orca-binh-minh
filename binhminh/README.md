# Orca Bình Minh

Bản Orca riêng của bạn: dựa trên Orca gốc v1.4.220 và fork Lamng, cộng các chỉnh sửa cho Windows và chữ ký Bình Minh.

Repo: https://github.com/bminhnemhoi/orca-binh-minh (private). Nhánh local `binhminh` đẩy lên `main` bằng `git push`.
Script và hướng dẫn này nằm trong thư mục `binhminh/` của repo; launcher `Start-Orca-BinhMinh.ps1` và
`CHAY-ORCA-BINHMINH.cmd` nằm ngoài repo ở `D:\Brainstorm_Idea\orca_bminh` vì script build tự sửa đường dẫn app trong đó.

Orca gốc dùng giấy phép MIT: giữ nguyên file `LICENSE` ở gốc repo khi phát triển hoặc chia sẻ.

## Ba phần của Orca

| Phần | Vị trí | Ghi chú |
|---|---|---|
| Source (mã nguồn bạn sửa) | `D:\Brainstorm_Idea\orca_bminh\orca`, nhánh `binhminh` | Mọi tùy chỉnh nằm ở đây, commit vào nhánh `binhminh` |
| App (bản đã build) | `D:\orca-local\releases\binhminh-*` | Luôn giữ 2 bản: đang dùng và dự phòng |
| Hồ sơ (dữ liệu của bạn) | `D:\orca-local\profiles\lamng-windows` | Project, tab, lịch sử, tài khoản. Đổi app không đụng tới |

Dự án của bạn nằm trong thư mục riêng của nó (ví dụ `D:\A_Bminhemhoi_trienkhai`), không nằm trong Orca.

## Mở Orca

Shortcut **Orca Bình Minh** (Desktop / Start Menu), hoặc `CHAY-ORCA-BINHMINH.cmd`.
Chỉ mở được một bản Orca trên một hồ sơ. Muốn đổi bản thì thoát hẳn bằng menu Orca > Quit rồi mở lại.

## Tùy chỉnh theo ý bạn

1. Sửa source (có thể nhờ agent ngay trong workspace **Orca Bình Minh**).
2. Commit vào nhánh `binhminh`, rồi `git push` để lưu lên GitHub.
3. Chạy `binhminh\Build-Orca-BinhMinh.ps1`. Script build, đóng gói, trỏ shortcut sang bản mới và giữ bản cũ làm dự phòng.
4. Thoát Orca, mở lại shortcut.

Quay về bản dự phòng: sửa dòng `$appPath` trong `Start-Orca-BinhMinh.ps1` về thư mục bản cũ trong `D:\orca-local\releases`.

Các mốc đã lưu: tag `binhminh-2026-10-29` là bản đang cài lúc thiết lập.

## Học hỏi từ repo khác

- `Xem-Cap-Nhat-Orca.ps1`: liệt kê bản Orca gốc mới nhất và các commit riêng của fork bạn theo dõi mà bạn chưa có.
- Thêm một fork để theo dõi: `Xem-Cap-Nhat-Orca.ps1 -Them ten https://github.com/ten/orca.git`
- Xem một commit: `git show <mã>`. Lấy về: `git cherry-pick <mã>`, rồi build lại.
- Commit đã xem và không cần lấy thì thêm mã vào danh sách `$daXem` trong script.

Remote: `github` (repo của bạn), `origin` (Orca gốc, stablyai/orca; chỉ lấy tag được chọn, cố ý để nhẹ) và
`lamng` (Towfienes/LamngOrca).

Lên bản Orca gốc mới (ví dụ v1.4.243) là việc lớn hơn cherry-pick: phải đưa các commit của nhánh `binhminh` lên bản mới và có thể gặp xung đột. Nên làm trên một nhánh thử, build và test trước khi dùng thật.

## Dung lượng

Mỗi bản app khoảng 0,7 GB. Script build tự xóa các bản `binhminh-*` cũ hơn bản dự phòng.
Script từ chối build khi ổ D còn dưới 3 GB.
