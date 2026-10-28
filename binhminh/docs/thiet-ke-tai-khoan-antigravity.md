# Thiết kế: Tài khoản Antigravity trong Orca Bình Minh

Trạng thái: đề xuất, chưa triển khai. Ngày: 2026-10-29. Áp dụng cho Orca Bình Minh trên Windows (nhánh `binhminh`, nền v1.4.220) và Antigravity CLI `agy` 1.4.x.

## 1. Tóm tắt

Orca đang quản lý nhiều tài khoản Claude và Codex: mỗi pane được gắn một tài khoản, chạy song song. Antigravity không làm được đúng như vậy với tài khoản gói Pro, vì `agy` chỉ có **một ô lưu đăng nhập Google cho cả máy**. Thiết kế này tách thành hai loại "tài khoản" với hai cách hoạt động khác nhau:

| | Tài khoản Google (gói Pro/Ultra) | Hồ sơ API key |
|---|---|---|
| Phạm vi | Toàn máy, mỗi lúc một tài khoản | Riêng từng pane, chạy song song |
| Hạn mức | Hạn mức gói (5 giờ / tuần) | Trả tiền theo lượng dùng của Gemini API |
| Đổi tài khoản | Quy trình chính thức `/logout` → đăng nhập lại | Chọn hồ sơ khi mở pane |
| Orca chạm vào credential Google? | Không bao giờ | Không (chỉ giữ API key do bạn nhập) |

Giai đoạn 1 làm cho tài khoản Google hiển thị rõ ràng và đổi được đúng quy trình ngay trong Orca. Giai đoạn 2 thêm hồ sơ API key chạy song song, theo đúng mô hình `CODEX_HOME`/`CLAUDE_CONFIG_DIR`.

## 2. Mục tiêu và phi mục tiêu

**Mục tiêu**
- Biết pane Antigravity nào đang chạy bằng tài khoản nào (email, gói, hạn mức), giống Claude/Codex.
- Đổi tài khoản Google ngay trong Orca, an toàn, không làm hỏng các pane đang chạy.
- Chạy nhiều phiên Antigravity song song trên các nguồn tính tiền khác nhau, bằng cơ chế mà Google hỗ trợ.

**Phi mục tiêu (không làm)**
- Không đọc, sao chép, lưu hay ghi đè mục keyring `gemini:antigravity`. Đây là điểm khác biệt với các công cụ "account switcher".
- Không tự động đổi tài khoản khi hết hạn mức, không xoay vòng, không gộp hạn mức qua proxy.
- Không dùng token OAuth của Antigravity ngoài chính `agy`. Điều khoản bổ sung của Antigravity, mục 6, coi việc này là vi phạm.

## 3. Sự thật về `agy` mà thiết kế dựa vào

Mức độ tin cậy: **[Đã thử]** = kiểm chứng trên máy này ngày 2026-10-29; **[Chính thức]** = tài liệu Google hoặc người của Google trả lời trên repo; **[Báo cáo]** = người dùng báo, chưa xác nhận.

1. **Đăng nhập Google nằm ở một mục keyring duy nhất cho cả người dùng Windows** (`gemini:antigravity`), không tách theo hồ sơ. [Chính thức, issue #1261] [Đã thử: `cmdkey /list`]
2. **Trên Windows, `agy` đọc thư mục cấu hình theo `USERPROFILE` của từng tiến trình** (bỏ qua `HOME`). Đặt `USERPROFILE` khác thì `.gemini\antigravity-cli\` và `.gemini\config\` được tách riêng. [Chính thức, #1261] [Đã thử: hồ sơ riêng tạo cây `.gemini` của nó; `cli.log` và `settings.json` thật không đổi]
3. **Chế độ API key** bật bằng `"modelProvider": "gemini"` trong `settings.json` cộng biến môi trường `GEMINI_API_KEY`. Chỉ có biến môi trường thì không có tác dụng. `GOOGLE_API_KEY` và `.env` bị bỏ qua. Có từ bản 1.1.13. [Chính thức] [Đã thử: thiếu key thì `agy` từ chối chạy với thông báo rõ ràng; có key thì `/config` báo `modelProvider gemini`, 0 token]
4. Gộp 2 và 3 lại: **chế độ API key có thể bật riêng từng pane**, không ảnh hưởng đăng nhập Google của các pane khác. [Đã thử]
5. **Đổi tài khoản chính thức**: `/logout` xoá token khỏi keyring, sau đó chạy lại `agy` để đăng nhập trong trình duyệt (qua SSH thì dán mã). [Chính thức] Mọi phiên `agy` khác đang chạy sẽ bị ảnh hưởng. [Chính thức, #1261]
6. **Lấy danh tính**: JSON của statusline có `email`, `plan_tier`, `quota`, `agent_state`, `model`, `cost`. Statusline chạy khi trạng thái agent đổi, tối đa mỗi 300 ms, timeout 5 giây, tắt sau 30 lần lỗi liên tiếp. `stack_with_default: true` giữ dòng trạng thái gốc. [Chính thức] Chưa có lệnh `agy whoami` (issue #1069). Hook không có trường tài khoản. [Chính thức]
7. **Giới hạn của chế độ API key**: hook có thể không chạy (#893), một số tính năng thiếu (#1322). [Báo cáo trên repo chính thức]
8. **Lỗi đã biết khi đổi tài khoản**: hạn mức hiển thị không làm mới sau `/logout` và đăng nhập tài khoản khác (#1311; Google chưa tái hiện được trên 1.4.4). [Báo cáo]
9. **Hạn mức gói gia đình** nhiều khả năng là dùng chung giữa các thành viên (nhiều báo cáo từ tháng 5 đến tháng 8/2026, issue #410). Google chưa xác nhận. [Báo cáo] Thiết kế không hứa hẹn thêm hạn mức khi đổi tài khoản.
10. Máy này đã có một công cụ đổi tài khoản bên thứ ba (mục keyring `agy-account:tai-khoan-1`, file `%LOCALAPPDATA%\agy\accounts-state.json`). Nó ghi đè `gemini:antigravity`, nên sẽ làm danh tính mà Orca thấy bị lệch. Khuyến nghị gỡ bỏ trước khi triển khai.

## 4. Hiện trạng trong Orca

- Bộ chọn tài khoản ở sidebar (`src/renderer/src/components/sidebar/DeckAgentAccountPicker.tsx`) xử lý riêng `agent === 'antigravity'`: danh sách tài khoản luôn rỗng, nhãn "Current agy account", nút "Sign in" chỉ gõ `agy login` vào một terminal (`deck-agent-session-launch.ts:44-52`). Nút bánh răng trỏ tới mục cài đặt `accounts-antigravity`, nhưng mục này không tồn tại.
- Hạn mức đọc bằng `agy -p /usage` (`src/main/rate-limits/antigravity-usage-command.ts`). Kết quả là một giá trị toàn cục, không có email.
- Hook được cài cứng vào `~/.gemini/config/hooks.json` (`src/main/antigravity/hook-service.ts:36`). Bộ quét session cứng `~/.gemini/antigravity-cli/brain` (`src/main/ai-vault/session-scanner-antigravity-sources.ts:11`).
- Tiến trình chính không có code môi trường riêng cho `agy`. Có tiền lệ thêm biến theo agent trong `src/main/ipc/pty/host-env/assembly.ts` (`OPENCODE_CONFIG_DIR`).
- **Bẫy cần tránh:** `ORCA_AGENT_LAUNCH_ACCOUNT_ID` được ghi là "pane Codex đã ghim" bất kể agent nào (`ipc/spawn-commit-persist.ts:97`, `runtime/spawn-commit.ts:226`). Antigravity phải dùng biến riêng.
- Claude và Codex không dùng chung interface nào. Hợp đồng không chính thức là bộ hàm `list / add / remove / select / reauthenticate`, kèm IPC `xxxAccounts:*`, cầu nối preload và RPC `accounts.*`. Antigravity làm theo cùng hình dạng đó.

## 5. Thiết kế

### 5.1 Quyết định chính

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Hai loại: "Tài khoản Google" (toàn máy) và "Hồ sơ API key" (theo pane) | Bám đúng giới hạn thật của `agy` (mục 3.1–3.4) |
| D2 | Orca không đọc hay ghi keyring `gemini:antigravity`; mọi thay đổi đăng nhập Google đều do chính `agy` làm | Tránh mục 6 của điều khoản; tránh lỗi đổi tài khoản giữa lúc `agy` làm mới token |
| D3 | Danh tính lấy từ statusline, chuyển về Orca qua cổng hook có sẵn | Nguồn chính thức duy nhất có `email`; không phải parse log hay màn hình |
| D4 | Biến riêng `ORCA_ANTIGRAVITY_PROFILE_ID`, không dùng `ORCA_AGENT_LAUNCH_ACCOUNT_ID` | Tránh bị ghi nhầm thành pane Codex (mục 4) |
| D5 | Mỗi hồ sơ API key có một "home" riêng: `<userData>\antigravity-profiles\<id>\home`, truyền bằng `USERPROFILE` | Cơ chế Google xác nhận (mục 3.2) |
| D6 | API key mã hoá bằng Electron `safeStorage` (DPAPI trên Windows), chỉ đưa vào môi trường của đúng pane đó | Không để key dạng chữ trong settings, log hay dòng lệnh |
| D7 | Khi hết hạn mức: hiện giờ reset và gợi ý mở pane bằng hồ sơ API key; không tự đổi tài khoản Google | Phi mục tiêu ở mục 2 |

### 5.2 Giai đoạn 1: Tài khoản Google hiển thị rõ và đổi đúng quy trình

**a. Relay statusline (danh tính trực tiếp từng pane)**
- Module mới `src/main/antigravity/statusline-relay.ts` cùng script build tương tự `hook-script.ts`. Script nhận JSON từ stdin, POST tới `http://127.0.0.1:$ORCA_AGENT_HOOK_PORT/statusline/antigravity` kèm id pane, rồi chạy tiếp statusline cũ của người dùng (nếu có) với cùng stdin và in ra kết quả đó.
- Cài đặt có quản lý vào `settings.json` thật: `statusLine = { type: "command", command: <relay>, stack_with_default: true }`. Statusline cũ lưu trong userData của Orca, không để trong `settings.json` vì `agy` có thể không chấp nhận khoá lạ. Gỡ cài đặt thì trả lại nguyên trạng. Thao tác ghi phải nguyên tử (file tạm rồi đổi tên), giống registry của Codex.
- Script phải nhanh (dưới 5 giây) và luôn thoát mã 0, để `agy` không tắt statusline sau 30 lần lỗi.
- Bộ lắng nghe hook (`src/shared/agent-hook-listener/`) thêm route mới, cập nhật `AntigravityPaneIdentity { email, planTier, quota, agentState, updatedAt }` theo pty.

**b. Giao diện**
- `DeckAgentAccountPicker`: nhánh Antigravity hiện email và gói của tài khoản Google đang dùng (lấy từ pane gần nhất), kèm hạn mức theo từng nhóm.
- `DeckPaneIdentity`: pane Antigravity lấy email từ danh tính trực tiếp, không đoán từ lựa chọn toàn cục. Quy tắc trong `DECK_AGENT_UX.md` vẫn giữ.
- Thêm mục `accounts-antigravity` trong Settings → Accounts (đúng id mà nút bánh răng đang trỏ tới): trạng thái đăng nhập, nút "Đổi tài khoản Google", và ở giai đoạn 2 là danh sách hồ sơ API key.

**c. Luồng "Đổi tài khoản Google"** (`src/main/antigravity/account-switch.ts` cùng IPC `antigravityAccount:switch`)
1. Liệt kê các pane `agy` đang sống (theo cách `live-pty-gate.ts` của Claude). Nếu còn pane thì hiện danh sách và yêu cầu bạn đóng chúng, không tự giết pane.
2. Mở một terminal chạy `agy`, gửi `/logout`, đợi `agy` thoát.
3. Chạy lại `agy` để `agy` mở trang đăng nhập Google. Bạn tự chọn tài khoản.
4. Khi statusline báo email mới, ép làm mới hạn mức (`fetchAntigravityRateLimits`), tránh lỗi #1311, và ghi email kèm số liệu hạn mức.
5. Không có bước nào đọc hay sao chép token.

**d. Phụ (nên làm)**
- Bật `AGY_CLI_OSC7501=1` cho pane `agy`, để `agy` tự báo trạng thái working/waiting/done/failed cho terminal. Việc này bù cho trường hợp hook không chạy. Cần kiểm tra trình phân tích OSC của Orca trước.

### 5.3 Giai đoạn 2: Hồ sơ API key chạy song song

**Lưu trữ** (`src/main/antigravity-profiles/`)
- `profile-store.ts`: các hồ sơ `{ id, label, createdAt, defaultModel? }` lưu trong settings (giống `codexManagedAccounts`).
- `profile-key-vault.ts`: key mã hoá bằng `safeStorage`, file `<userData>\antigravity-profiles\<id>\key.bin`. Không bao giờ trả key về renderer; renderer chỉ thấy 4 ký tự cuối.
- `profile-home.ts`: tạo `home\.gemini\antigravity-cli\settings.json` với `modelProvider: "gemini"`, cộng `trustedWorkspaces` và `model` đồng bộ từ settings thật. Có file đánh dấu quyền sở hữu, chống symlink và chống đường dẫn ra ngoài thư mục gốc (làm theo `managed-auth-path.ts` của Claude).
- `service.ts`: `list / add / rename / remove / validate`, các thay đổi chạy tuần tự (`serializeMutation`).

**Khởi chạy pane** (`src/main/ipc/pty/host-env/antigravity-profile-launch.ts`, theo mẫu `codex-launch-account.ts`)
- Chỉ áp dụng khi `launchAgent === 'antigravity'` và có `ORCA_ANTIGRAVITY_PROFILE_ID`. Từ chối với pane remote hoặc WSL.
- Thêm vào môi trường: `USERPROFILE=<profile home>`, `GEMINI_API_KEY=<key>`, `HOME=<home thật>` (Git for Windows và SSH dùng `HOME`, nên vẫn thấy `.gitconfig` và `.ssh` thật), `npm_config_userconfig` và `npm_config_cache` trỏ về vị trí thật.
- Xoá `GEMINI_API_KEY` khỏi môi trường của mọi pane không dùng hồ sơ, để key không rò sang pane khác.
- Gọi từ `spawn-preflight.ts` (cả bản ipc và runtime), giống `prepareClaudeAuth`.

**Tích hợp còn lại**
- Hook: đồng bộ hook của Orca vào `home\.gemini\config\hooks.json` của hồ sơ (giống `syncManagedHooksToConfigDir`). Có thể không chạy do #893, nên trạng thái pane dựa vào OSC 7501 và các quy tắc nhận diện màn hình sẵn có.
- Statusline relay cũng cài vào hồ sơ. Ở chế độ key thì không có `quota`, chỉ có `cost` ước tính, nên giao diện hiện "API key · chi phí ước tính" thay cho thanh hạn mức.
- Bộ quét session thêm thư mục `brain` của từng hồ sơ (theo `managedClaudeSessionRoots`).
- Kiểm tra key: gọi API liệt kê model của Gemini bằng key đó (không tốn token). Không dùng `agy -p` để kiểm tra vì `/config` không xác thực key.
- IPC `antigravityProfiles:{list,add,rename,remove,validate}`, cầu nối preload, RPC `accounts.*`. Bộ chọn ở sidebar hiện các hồ sơ bên dưới mục "Tài khoản Google hiện tại".

**Tác dụng phụ của việc đổi `USERPROFILE` (cần kiểm tra ở bước thử nghiệm)**
- Mọi tiến trình con của pane đó thấy home khác. Node `os.homedir()`, Python `~` và PowerShell `$HOME` sẽ trỏ vào home của hồ sơ. Biện pháp: các biến ở trên, cộng junction từ home hồ sơ tới `.ssh`, `.gitconfig`, `.npmrc` thật nếu cần.
- Không ảnh hưởng `%APPDATA%` và `%LOCALAPPDATA%`, vì các biến đó vẫn giữ nguyên.

## 6. Kế hoạch triển khai

| Bước | Nội dung | Kết quả nghiệm thu |
|---|---|---|
| 0. Thử nghiệm | Gỡ công cụ đổi tài khoản bên thứ ba. Thử relay statusline bằng tay. Thử pane hồ sơ API key thật (key của bạn) với git, npm, ssh. Kiểm tra OSC 7501 | Có bảng kết quả; quyết định giữ hay bỏ từng biện pháp ở mục 5.3 |
| 1a | Relay statusline + danh tính pane | Pane `agy` hiện đúng email và gói; tắt Orca thì statusline cũ được khôi phục |
| 1b | Mục Settings `accounts-antigravity` + luồng đổi tài khoản | Đổi tài khoản thành công khi không có pane sống; bị chặn có giải thích khi còn pane |
| 2a | Lưu hồ sơ + vault key + home | Unit test: chống symlink/đường dẫn lạ, mã hoá, xoá sạch |
| 2b | Môi trường pane + bộ chọn | Hai pane chạy song song, một bằng Google, một bằng API key, không ảnh hưởng nhau |
| 2c | Hook, session, chi phí, kiểm tra key | Session của hồ sơ hiện trong lịch sử; key sai bị báo trước khi mở pane |

Ước lượng thô cho một người kèm agent: giai đoạn 1 khoảng 2–3 ngày, giai đoạn 2 khoảng 4–6 ngày, chưa tính chỉnh sửa sau khi chạy thực tế.

## 7. Kiểm thử

- Vitest, file test đặt cạnh code (`*.test.ts`). Bộ bảo vệ `vitest-real-agent-home-write-guard.ts` chặn ghi vào `.gemini` thật, nên mọi module phải nhận đường dẫn home qua tham số.
- Unit test bắt buộc: gộp và khôi phục statusline (có và không có statusline cũ, file hỏng); bản vá môi trường của hồ sơ (đúng agent, sai agent, remote/WSL bị từ chối, key không rò sang pane khác); chặn đổi tài khoản khi còn pane sống.
- Test với `agy` thật chỉ chạy khi `ORCA_REAL_AGY_CLI_TEST=1` (theo `antigravity-usage-real-cli.test.ts`), dùng `/config` và `/hooks` (không tốn hạn mức).
- E2E Playwright cho bộ chọn ở sidebar (theo `codex-account-restart-input.spec.ts`).

## 8. Rủi ro

| Rủi ro | Khả năng | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|
| `agy` đổi định dạng statusline hoặc cách đọc `USERPROFILE` | Trung bình (CLI cập nhật thường xuyên) | Mất danh tính, hồ sơ hỏng | Kiểm tra phiên bản tối thiểu như `antigravity-usage-command.ts`; test với CLI thật |
| Relay làm hỏng statusline của người dùng | Thấp | Khó chịu | Luôn thoát mã 0; tự khôi phục khi gỡ; lưu bản cũ |
| Đổi `USERPROFILE` làm git/npm/ssh dùng sai cấu hình | Trung bình | Lỗi khó hiểu trong pane | Các biến ở mục 5.3; bước 0 kiểm tra kỹ |
| Lộ API key | Thấp | Mất tiền | `safeStorage`; không log; xoá khỏi pane khác |
| Hạn mức gia đình dùng chung, đổi tài khoản không có thêm hạn mức | Cao | Kỳ vọng sai | Ghi rõ trong giao diện; không hứa hẹn |
| Vi phạm điều khoản | Thấp với thiết kế này | Khoá tài khoản | D2, D7: chỉ dùng `agy` chính thức, không động tới token, không tự động |

## 9. Nguồn

- Antigravity CLI (repo chính thức): https://github.com/google-antigravity/antigravity-cli — issues [#155](https://github.com/google-antigravity/antigravity-cli/issues/155), [#381](https://github.com/google-antigravity/antigravity-cli/issues/381), [#1261](https://github.com/google-antigravity/antigravity-cli/issues/1261), [#1080](https://github.com/google-antigravity/antigravity-cli/issues/1080), #1069, #1311, #893, #1322, #410
- Tài liệu chính thức: [cài đặt và xác thực](https://antigravity.google/docs/install?tab=cli), [tham chiếu CLI](https://antigravity.google/docs/cli/reference/), [statusline](https://antigravity.google/docs/cli/statusline/), [hooks](https://antigravity.google/docs/hooks/), [gói và hạn mức](https://antigravity.google/docs/plans/), [điều khoản bổ sung](https://antigravity.google/terms)
- Tham chiếu thiết kế: [Claude Code `CLAUDE_CONFIG_DIR`](https://code.claude.com/docs/en/env-vars), [Codex `CODEX_HOME`](https://developers.openai.com/codex/auth), [Gemini CLI xác thực](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/authentication.mdx), [AgentsRoom](https://agentsroom.dev/blog/multiple-accounts-antigravity-cli), [CCS account safety](https://docs.ccs.kaitran.ca/features/config/account-safety.md)
- Báo cáo về khoá tài khoản và hạn mức gia đình: [Google AI forum #128208](https://discuss.ai.google.dev/t/appeal-3-antigravity-pro-accounts-got-403-forbidden-today-unaware-of-tool-violation/128208), [#169488](https://discuss.ai.google.dev/t/google-ai-ultra-20x-family-members-appear-to-share-antigravity-quotas-is-this-intended/169488), [#178592](https://discuss.ai.google.dev/t/quota-shared-exhausted-across-two-separate-google-accounts-pro-plan-when-switching-accounts-in-antigravity/178592)
