diff --git a/chrome/browser/ui/webui/settings/settings_ui.cc b/chrome/browser/ui/webui/settings/settings_ui.cc
index ee6aaefb7fc82..83e3f47da279e 100644
--- a/chrome/browser/ui/webui/settings/settings_ui.cc
+++ b/chrome/browser/ui/webui/settings/settings_ui.cc
@@ -214,6 +214,7 @@ void SettingsUI::RegisterProfilePrefs(
   registry->RegisterBooleanPref(prefs::kImportDialogHistory, true);
   registry->RegisterBooleanPref(prefs::kImportDialogSavedPasswords, true);
   registry->RegisterBooleanPref(prefs::kImportDialogSearchEngine, true);
+  registry->RegisterBooleanPref(prefs::kImportDialogExtensions, true);
 }
 
 SettingsUI::SettingsUI(content::WebUI* web_ui)
