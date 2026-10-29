# Tài nguyên thú cưng (Góc Bình Minh)

Mọi tài nguyên đều là **CC0** hoặc **public domain**, không bắt buộc ghi công. Danh sách dưới đây để biết nguồn gốc và tạo lại khi cần.

## Mô hình 3D

"Cube Pets" 2.0 của Kenney (www.kenney.nl), CC0 1.0: https://kenney.nl/assets/cube-pets

| Thú cưng | File | Chuyển động có sẵn |
|---|---|---|
| Mèo, Chó, Cáo, Thỏ (bunny), Gấu trúc, Chim cánh cụt | `animal-<tên>.glb` | static, idle, walk, run, eat, dance, gesture-positive, gesture-negative |

Texture `Textures/colormap.png` được nhúng vào từng GLB bằng `npx @gltf-transform/cli copy in.glb out.glb`.
Hamster không có mô hình 3D miễn phí nên chỉ có ở kiểu Phẳng (SVG tự vẽ).

## Âm thanh

| Thú cưng | Nguồn | Giấy phép |
|---|---|---|
| Mèo | BigSoundBank #1472, #0494 (Joseph Sardin): https://bigsoundbank.com/UPLOAD/ogg/1472.ogg | CC0 |
| Chó | "Small Dog Bark" của SecureSubset: https://freesound.org/s/800278 | CC0 |
| Cáo | "foxBark2.wav" của Setzilla: https://freesound.org/s/173208 | CC0 |
| Thỏ | "Rabbit Thump on Soil" của kessir: https://freesound.org/s/386007 | CC0 |
| Gấu trúc | "Giant panda twittering" (Wikimedia Commons): https://commons.wikimedia.org/wiki/File:Giant_panda_twittering.ogg | Public domain |
| Chim cánh cụt | "Lovebird Chirpping" của bowlingballout: https://freesound.org/s/577768 | CC0 |
| Hamster | "hamster Squeak" của lusania: https://freesound.org/s/815243 | CC0 |

## Tạo lại

1. Tải các file trên vào một thư mục nguồn (giữ tên như trong `binhminh/tools/build-pet-sounds.sh`).
2. `bash binhminh/tools/build-pet-sounds.sh <nguồn> <thư-mục-âm-thanh>`: cắt, chuẩn hoá đỉnh −2 dBFS, nén Opus mono.
3. `node binhminh/tools/embed-pet-assets.mjs <thư-mục-glb> <thư-mục-âm-thanh>`: sinh `pet3d/models/*.ts` và `pet-sound-data.ts`.
