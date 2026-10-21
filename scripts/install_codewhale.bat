@echo off
rem install_codewhale.bat — HyperNexus -> Codewhale integration installer wrapper.
rem Modes: (none)=project install, --global, --check, --uninstall
node "%~dp0..\addons\codewhale\install.mjs" %*
exit /b %errorlevel%
