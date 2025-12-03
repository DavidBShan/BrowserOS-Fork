diff --git a/chrome/browser/extensions/api/settings_private/prefs_util.cc b/chrome/browser/extensions/api/settings_private/prefs_util.cc
index 79c4eb8fc905c..1fff3dcc6df26 100644
--- a/chrome/browser/extensions/api/settings_private/prefs_util.cc
+++ b/chrome/browser/extensions/api/settings_private/prefs_util.cc
@@ -592,6 +592,11 @@ const PrefsUtil::TypedPrefMap& PrefsUtil::GetAllowlistedKeys() {
   (*s_allowlist)[::prefs::kCaretBrowsingEnabled] =
       settings_api::PrefType::kBoolean;
 
+  // BrowserOS prefs
+  (*s_allowlist)[prefs::kBrowserOSProviders] = settings_api::PrefType::kString;
+  (*s_allowlist)[prefs::kBrowserOSShowToolbarLabels] = settings_api::PrefType::kBoolean;
+  (*s_allowlist)[prefs::kBrowserOSCustomProviders] = settings_api::PrefType::kString;
+
 #if BUILDFLAG(IS_CHROMEOS)
   // Accounts / Users / People.
   (*s_allowlist)[ash::kAccountsPrefAllowGuest] =
@@ -1180,6 +1185,8 @@ const PrefsUtil::TypedPrefMap& PrefsUtil::GetAllowlistedKeys() {
       settings_api::PrefType::kBoolean;
   (*s_allowlist)[::prefs::kImportDialogSearchEngine] =
       settings_api::PrefType::kBoolean;
+  (*s_allowlist)[::prefs::kImportDialogExtensions] =
+      settings_api::PrefType::kBoolean;
 #endif  // BUILDFLAG(IS_CHROMEOS)
 
   // Supervised Users.  This setting is queried in our Tast tests (b/241943380).
