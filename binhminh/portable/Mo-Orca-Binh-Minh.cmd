@echo off
rem Mo Orca Binh Minh voi ho so rieng trong %LOCALAPPDATA%\OrcaBinhMinh\profile, de khong
rem dung chung ho so voi Orca chinh thuc neu may da cai. Ho so van giu khi doi sang ban moi.
set "ORCA_USER_DATA_PATH=%LOCALAPPDATA%\OrcaBinhMinh\profile"
start "" "%~dp0Orca.exe" "--user-data-dir=%ORCA_USER_DATA_PATH%"
