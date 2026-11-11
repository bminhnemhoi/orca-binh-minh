# Cài Orca Bình Minh trên máy khác

Orca Bình Minh là một bản Orca tuỳ biến (Orca: app chạy nhiều agent AI song song, mỗi agent một worktree).
Bản này dựa trên Orca gốc v1.4.220 và fork [LamngOrca](https://github.com/Towfienes/LamngOrca). Hướng dẫn này dành cho **Windows 10/11 64-bit**.

## Có gì khác Orca gốc

- **Góc Bình Minh** ở cuối thanh bên phải:
  - Thú cưng 3D có tiếng kêu thật và khung ảnh.
  - Hạn mức Claude / Codex / Antigravity kèm biểu đồ, và CPU/RAM của máy.
  - Gợi ý tối ưu, nhắc ngày kỷ niệm, 5 phong cách giao diện.
  - Chỉnh trong **Settings → Góc Bình Minh**.
- **Tài khoản Antigravity (agy)**: Orca nhớ các email đã đăng nhập và đổi tài khoản theo quy trình chính thức của Google.
- **Giao diện workspace của fork Lamng**: chọn tài khoản khi mở agent, chia pane agent, hạn mức ở thanh bên.
- **Không tự cập nhật lên Orca gốc**, để không ghi đè bản tuỳ biến.
- Chữ ký "Bình Minh" trên thanh tiêu đề.

Có hai cách cài. Cách 1 đủ cho người chỉ dùng. Cách 2 dành cho người muốn tự sửa và build.

## Cách 1: Tải bản dựng sẵn (khoảng 5 phút)

1. Vào [Releases](https://github.com/bminhnemhoi/orca-binh-minh/releases) và tải file `OrcaBinhMinh-*.zip` của bản mới nhất.
2. Giải nén cả thư mục `OrcaBinhMinh` ra một chỗ cố định, ví dụ `D:\Apps\OrcaBinhMinh`. Đừng chạy thẳng trong file zip.
3. Nhấp đúp `Mo-Orca-Binh-Minh.cmd`.
   - Lần đầu Windows có thể báo **"Windows protected your PC"** vì bản này không có chữ ký số. Bấm **More info → Run anyway**.
4. Muốn có biểu tượng ngoài Desktop: chuột phải `Mo-Orca-Binh-Minh.cmd` → **Send to → Desktop (create shortcut)**. Trên Windows 11 thì bấm **Show more options** trước.
5. Cài CLI của agent bạn dùng, ví dụ Claude Code, Codex hay Antigravity (`agy`). Orca chỉ điều phối, không kèm sẵn các agent này.

**Dữ liệu** (project, tab, cài đặt, ảnh trong Góc Bình Minh) nằm ở `%LOCALAPPDATA%\OrcaBinhMinh\profile`, tách khỏi thư mục app. Vì vậy:
- Đổi sang bản mới không mất gì.
- Nếu máy đã có Orca chính thức, hai bản không dùng chung dữ liệu.

**Cập nhật:**
1. Tải zip mới và giải nén ra thư mục mới.
2. Thoát Orca cũ bằng menu **Orca → Quit**.
3. Mở bản mới, rồi xoá thư mục cũ.

## Cách 2: Tự build từ mã nguồn (để chỉnh sửa)

Máy nên có 16 GB RAM (lúc build cần khoảng 8 GB trống) và khoảng 10 GB ổ trống.

### Bước 1: Cài công cụ (một lần)

Mở PowerShell và chạy:

```powershell
winget install --id Git.Git -e
winget install --id Python.Python.3.12 -e
winget install --id Rustlang.Rustup -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

- **Node.js 24**: tải bản **24.x** ở [nodejs.org](https://nodejs.org/en/download). Repo yêu cầu đúng Node 24.
- **pnpm**: sau khi có Node, chạy `npm install -g pnpm@12.8.1`. Đây là đúng phiên bản repo dùng.

Đóng PowerShell, mở cửa sổ mới, rồi kiểm tra:

```powershell
node --version    # v24.x
pnpm --version    # 12.8.1
cargo --version
```

### Bước 2: Lấy mã nguồn và cài thư viện

```powershell
git clone https://github.com/bminhnemhoi/orca-binh-minh.git
cd orca-binh-minh
pnpm install
```

Lần đầu có thể mất 10–20 phút vì phải tải Electron và biên dịch module native.

### Bước 3: Build và cài

```powershell
powershell -ExecutionPolicy Bypass -File binhminh\Build-Orca-BinhMinh.ps1 -SkipTypecheck
```

Mất khoảng 15–30 phút. Xong sẽ có shortcut **Orca Bình Minh** trên Desktop và Start Menu.
- App, launcher và hồ sơ nằm trong `%LOCALAPPDATA%\OrcaBinhMinh`.
- Hồ sơ dùng chung với bản tải ở Cách 1, nhưng mỗi lúc chỉ mở được một bản trên một hồ sơ.
- Từ lần build thứ hai, script giữ bản trước làm dự phòng và xoá các bản cũ hơn.

Muốn để app và hồ sơ ở ổ khác: tạo file `binhminh\may-nay.ps1` (file này không được commit), ví dụ:

```powershell
$releases = 'E:\OrcaBinhMinh\releases'
$launcher = 'E:\OrcaBinhMinh\Start-Orca-BinhMinh.ps1'
$profilePath = 'E:\OrcaBinhMinh\profile'
```

Bỏ `-SkipTypecheck` thì script kiểm tra kiểu TypeScript trước khi build: chậm hơn nhưng bắt lỗi sớm khi bạn sửa code.
Thêm `-Zip` để có file zip gửi người khác, giống bản ở Releases.

### Bước 4: Chỉnh sửa và nhận cập nhật

- **Tự sửa:** sửa code, `git commit`, rồi chạy lại lệnh ở Bước 3. Script từ chối build khi còn thay đổi chưa commit, để bạn luôn biết bản đang cài được build từ commit nào.
- **Nhận cập nhật từ repo này:** `git pull`, rồi build lại.

## Cá nhân hoá

- **Chữ ký trên thanh tiêu đề:** sửa chữ "Bình Minh" trong `src/renderer/src/app-shell/BinhMinhSignature.tsx`, rồi build lại (chỉ làm được với Cách 2).
- **Góc Bình Minh:** Settings → Góc Bình Minh để chọn phong cách, thú cưng, ảnh, ngày kỷ niệm. Ảnh chỉ lưu trong hồ sơ trên máy, không lên mạng.
- **Đổi tài khoản Antigravity:** agy chỉ giữ **một** tài khoản Google trên mỗi máy, nên đăng nhập tài khoản khác là thay chứ không thêm.
  1. Đóng các tab agy khác.
  2. Trong agy gõ `/logout`, nhấn Enter, rồi gõ `y`.
  3. Đăng nhập tài khoản khác trên trang Google mà agy mở.

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| "Windows protected your PC" | More info → Run anyway |
| Bấm mở mà không thấy gì, hoặc báo có bản Orca khác đang mở cùng hồ sơ | Thoát hẳn bản kia (menu Orca → Quit) rồi mở lại |
| Build báo không chạy được `cargo` | Cài Rust ở Bước 1, mở PowerShell mới |
| Build báo lỗi `node-gyp` hoặc MSBuild | Thiếu Visual Studio Build Tools (C++), cài lại lệnh ở Bước 1 |
| Build dừng giữa chừng không báo lỗi rõ | Thiếu RAM: đóng bớt ứng dụng rồi chạy lại |
| `Typecheck that bai` | Có lỗi kiểu trong code vừa sửa; đọc lỗi phía trên dòng đó |

## Giấy phép

- MIT, xem file `LICENSE` ở gốc repo.
- Dựa trên [stablyai/orca](https://github.com/stablyai/orca) và [Towfienes/LamngOrca](https://github.com/Towfienes/LamngOrca).
- Mô hình thú cưng của Kenney và âm thanh thuộc CC0 hoặc phạm vi công cộng, chi tiết ở [docs/pet-assets.md](docs/pet-assets.md).
