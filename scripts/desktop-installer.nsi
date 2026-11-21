Unicode true
Name "幻想镇 3rd"
OutFile "${OUTPUT_FILE}"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\HXZ-3RD"
InstallDirRegKey HKCU "Software\HXZ\Third" "InstallDir"
Icon "${APP_ICON}"
SetCompressor /SOLID lzma
!include MUI2.nsh
!include FileFunc.nsh
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"
Section
  SetOutPath "$INSTDIR"
  File /r "${SOURCE_DIR}\*"
  FileOpen $0 "$INSTDIR\installed.flag" w
  IfFileExists "$EXEDIR\extensions\HXZ-Community-Plugin-${PRODUCT_VERSION}.zip" 0 +2
  FileWriteUTF16LE /BOM $0 "$EXEDIR\extensions"
  FileClose $0
  WriteUninstaller "$INSTDIR\卸载幻想镇.exe"
  IfFileExists "$INSTDIR\no-shell.flag" registration_done 0
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "/NOSHELL" $1
  IfErrors register_shell
  FileOpen $0 "$INSTDIR\no-shell.flag" w
  FileClose $0
  Goto registration_done
  register_shell:
  CreateShortCut "$SMPROGRAMS\幻想镇 3rd.lnk" "$INSTDIR\幻想镇 3rd.exe"
  CreateShortCut "$SMPROGRAMS\幻想镇 极简版.lnk" "$INSTDIR\幻想镇 极简版.exe"
  WriteRegStr HKCU "Software\HXZ\Third" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Classes\hxz3-room" "" "URL:幻想镇 3rd 房间邀请"
  WriteRegStr HKCU "Software\Classes\hxz3-room" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\hxz3-room\shell\open\command" "" '"$INSTDIR\幻想镇 3rd.exe" "%1"'
  ReadRegStr $0 HKCR "hxz-room\shell\open\command" ""
  StrCmp $0 "" 0 invitations_done
  WriteRegStr HKCU "Software\Classes\hxz-room" "" "URL:幻想镇房间邀请"
  WriteRegStr HKCU "Software\Classes\hxz-room" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\hxz-room\shell\open\command" "" '"$INSTDIR\幻想镇 3rd.exe" "%1"'
  invitations_done:
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HXZ-3RD" "DisplayName" "幻想镇 3rd"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HXZ-3RD" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HXZ-3RD" "UninstallString" '"$INSTDIR\卸载幻想镇.exe"'
  registration_done:
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "--updated" $1
  IfErrors +2
  Exec '"$INSTDIR\幻想镇 3rd.exe"'
SectionEnd
Section "Uninstall"
  !include "${UNINSTALL_FILES}"
  IfFileExists "$INSTDIR\no-shell.flag" cleanup_files 0
  Delete "$SMPROGRAMS\幻想镇 3rd.lnk"
  Delete "$SMPROGRAMS\幻想镇 极简版.lnk"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HXZ-3RD"
  ReadRegStr $0 HKCU "Software\Classes\hxz-room\shell\open\command" ""
  StrCmp $0 '"$INSTDIR\幻想镇 3rd.exe" "%1"' 0 +2
  DeleteRegKey HKCU "Software\Classes\hxz-room"
  ReadRegStr $0 HKCU "Software\Classes\hxz3-room\shell\open\command" ""
  StrCmp $0 '"$INSTDIR\幻想镇 3rd.exe" "%1"' 0 +2
  DeleteRegKey HKCU "Software\Classes\hxz3-room"
  DeleteRegKey HKCU "Software\HXZ\Third"
  cleanup_files:
  Delete "$INSTDIR\no-shell.flag"
  Delete "$INSTDIR\installed.flag"
  Delete "$INSTDIR\卸载幻想镇.exe"
  RMDir "$INSTDIR"
SectionEnd
